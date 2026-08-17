const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /purchase/entry - Get today's purchase (or by date)
router.get('/entry', requireRole(['ADMIN', 'WAREHOUSE', 'PURCHASE_MAN']), async (req, res) => {
  try {
    const entry_date = req.query.date || new Date().toISOString().split('T')[0];

    const purchases = await db('purchase_entry').where({ entry_date, created_by: req.user.id });
    if (purchases.length === 0) return res.json({ lines: [] });

    const purchaseIds = purchases.map(p => p.id);
    const lines = await db('purchase_entry_line')
      .join('product', 'purchase_entry_line.product_id', 'product.id')
      .select('purchase_entry_line.*', 'product.name as product_name', 'product.group_id')
      .whereIn('purchase_entry_id', purchaseIds);

    // Aggregate lines by product_id and unit_id so the Godown grid sees a consolidated view
    const aggregated = {};
    for (const l of lines) {
      const key = `${l.product_id}_${l.unit_id}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...l };
      } else {
        aggregated[key].qty_purchased = parseFloat(aggregated[key].qty_purchased) + parseFloat(l.qty_purchased);
        aggregated[key].unit_qty = parseFloat(aggregated[key].unit_qty || 0) + parseFloat(l.unit_qty || 0);
        // Rate might be an average or just the latest? Let's take the latest or max for simplicity in the grid
        aggregated[key].rate = l.rate || aggregated[key].rate; 
      }
    }

    res.json({ id: purchaseIds[0], entry_date, lines: Object.values(aggregated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /purchase/men-summary - Get summary of all purchase men purchases
router.get('/men-summary', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const entry_date = req.query.date || new Date().toISOString().split('T')[0];
    
    const lines = await db('purchase_entry')
      .join('purchase_entry_line', 'purchase_entry.id', 'purchase_entry_line.purchase_entry_id')
      .join('app_user', 'purchase_entry.created_by', 'app_user.id')
      .join('product', 'purchase_entry_line.product_id', 'product.id')
      .join('unit', 'purchase_entry_line.unit_id', 'unit.id')
      .leftJoin('supplier', 'purchase_entry.supplier_id', 'supplier.id')
      .where('purchase_entry.entry_date', entry_date)
      .andWhere('app_user.role', 'PURCHASE_MAN')
      .select(
        'purchase_entry_line.product_id',
        'product.name as product_name',
        'unit.name as unit_name',
        'purchase_entry_line.unit_id',
        'app_user.username as purchase_man_name',
        'supplier.name as supplier_name'
      )
      .sum('purchase_entry_line.qty_purchased as total_qty')
      .sum('purchase_entry_line.unit_qty as total_unit_qty')
      .groupBy(
        'purchase_entry_line.product_id', 
        'product.name', 
        'unit.name',
        'purchase_entry_line.unit_id',
        'app_user.username',
        'supplier.name'
      )
      .orderBy('product.name');

    res.json(lines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /purchase/entry - Save/update today's purchase
router.post('/entry', requireRole(['ADMIN', 'WAREHOUSE', 'PURCHASE_MAN']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const entry_date = req.body.date || new Date().toISOString().split('T')[0];
    const { lines, supplier_id } = req.body;

    let purchaseId;
    let totalAmount = 0;

    if (req.user.role === 'PURCHASE_MAN') {
      // Purchase man always creates a new entry for their specific transaction
      const [inserted] = await trx('purchase_entry')
        .insert({ entry_date, created_by: req.user.id, supplier_id: supplier_id || null })
        .returning('*');
      purchaseId = inserted.id;
    } else {
      // Godown overwrites their default entry (with no supplier_id usually)
      let purchase = await trx('purchase_entry').where({ entry_date, created_by: req.user.id }).first();
      if (!purchase) {
        const [inserted] = await trx('purchase_entry')
          .insert({ entry_date, created_by: req.user.id, supplier_id: null })
          .returning('*');
        purchaseId = inserted.id;
      } else {
        purchaseId = purchase.id;
        await trx('purchase_entry_line').where({ purchase_entry_id: purchaseId }).delete();
      }
    }

    if (lines && lines.length > 0) {
      const linesToInsert = lines.filter(l => l.qty_purchased > 0 || l.unit_qty > 0).map(l => {
        const qty = parseFloat(l.qty_purchased || 0);
        const rate = parseFloat(l.rate || 0);
        totalAmount += (qty * rate); // calculate total spent
        
        return {
          purchase_entry_id: purchaseId,
          product_id: l.product_id,
          unit_id: l.unit_id,
          qty_purchased: qty,
          unit_qty: l.unit_qty || 0,
          rate: rate || null
        };
      });
      
      if (linesToInsert.length > 0) {
        await trx('purchase_entry_line').insert(linesToInsert);
      }
    }

    // Deduct from wallet if Purchase Man
    if (req.user.role === 'PURCHASE_MAN' && totalAmount > 0) {
      await trx('wallet_transaction').insert({
        user_id: req.user.id,
        amount: -totalAmount,
        type: 'DEBIT',
        description: `Market Purchase (Supplier ${supplier_id || 'Unknown'})`,
        reference_id: purchaseId,
        created_by: req.user.id
      });

      await trx('purchase_man_profile')
        .where({ user_id: req.user.id })
        .decrement('balance', totalAmount);
    }

    await trx.commit();
    res.json({ success: true, purchase_id: purchaseId });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
