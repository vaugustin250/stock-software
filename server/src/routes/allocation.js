const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /allocation - Get Matrix of requirements and allocations for a given date
router.get('/', requireRole(['WAREHOUSE', 'ADMIN']), async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Get all active Purchase Men
    const purchaseMen = await db('app_user')
      .select('id', 'username')
      .where({ role: 'PURCHASE_MAN', is_active: true });

    // 2. Get combined Godown closing stock for the day (from POs)
    const pos = await db('po_entry').where({ entry_date: date });
    const poIds = pos.map(p => p.id);

    let closingStockLines = [];
    if (poIds.length > 0) {
      closingStockLines = await db('po_entry_line')
        .select('product_id')
        .sum('qty as total_qty')
        .sum('unit_qty as total_unit_qty')
        .whereIn('po_entry_id', poIds)
        .groupBy('product_id');
    }

    // 3. Get all active products
    const products = await db('product')
      .join('unit', 'product.default_unit_id', 'unit.id')
      .select(
        'product.id as product_id', 
        'product.name as product_name', 
        'product.name_tamil as product_name_tamil', 
        'product.default_unit_id as unit_id',
        'unit.name as unit_name'
      )
      .where({ 'product.is_active': true });

    // 4. Get existing allocations for the day
    const allocations = await db('purchase_man_allocation').where({ date });

    // 5. Build Matrix for ALL products
    // matrix: [ { product_id, product_name, total_closing_qty, unit_id, unit_name, allocations: { [pm_id]: allocated_qty } } ]
    let matrix = products.map(prod => {
      const closingRow = closingStockLines.find(c => c.product_id === prod.product_id);
      const total_closing_qty = closingRow ? parseFloat(closingRow.total_qty) : 0;
      const total_closing_unit_qty = closingRow ? parseFloat(closingRow.total_unit_qty || 0) : 0;
      
      const prodAllocations = {};
      purchaseMen.forEach(pm => {
        const alloc = allocations.find(a => a.product_id === prod.product_id && a.purchase_man_id === pm.id);
        prodAllocations[pm.id] = alloc ? parseFloat(alloc.allocated_qty) : 0;
      });
      
      return {
        ...prod,
        total_closing_qty,
        total_closing_unit_qty,
        allocations: prodAllocations
      };
    });

    // 6. Sort: Products with active closing stock > 0 first, then alphabetically by name
    matrix.sort((a, b) => {
      if (a.total_closing_qty > 0 && b.total_closing_qty === 0) return -1;
      if (b.total_closing_qty > 0 && a.total_closing_qty === 0) return 1;
      return a.product_name.localeCompare(b.product_name);
    });

    res.json({ purchaseMen, matrix });
  } catch (err) {
    console.error('API Error in /allocation:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /allocation - Bulk upsert allocations from Matrix view
router.post('/', requireRole(['WAREHOUSE', 'ADMIN']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const { date, allocations } = req.body;
    if (!date || !allocations || !Array.isArray(allocations)) {
      await trx.rollback();
      return res.status(400).json({ error: 'Date and allocations array required' });
    }

    // Process each allocation: { purchase_man_id, product_id, allocated_qty, unit_id }
    for (const alloc of allocations) {
      if (alloc.allocated_qty > 0) {
        await trx('purchase_man_allocation')
          .insert({
            date,
            purchase_man_id: alloc.purchase_man_id,
            product_id: alloc.product_id,
            allocated_qty: alloc.allocated_qty,
            unit_id: alloc.unit_id,
            updated_at: trx.fn.now()
          })
          .onConflict(['date', 'purchase_man_id', 'product_id'])
          .merge({
            allocated_qty: alloc.allocated_qty,
            unit_id: alloc.unit_id,
            updated_at: trx.fn.now()
          });
      } else {
        // If qty is 0, delete it if it exists
        await trx('purchase_man_allocation')
          .where({
            date,
            purchase_man_id: alloc.purchase_man_id,
            product_id: alloc.product_id
          })
          .delete();
      }
    }

    await trx.commit();
    res.json({ success: true });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

// GET /allocation/my - Get allocations for logged in Purchase Man
router.get('/my', requireRole(['PURCHASE_MAN']), async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const data = await db('purchase_man_allocation')
      .join('product', 'purchase_man_allocation.product_id', 'product.id')
      .join('unit', 'purchase_man_allocation.unit_id', 'unit.id')
      .select(
        'purchase_man_allocation.product_id',
        'purchase_man_allocation.allocated_qty as total',
        'purchase_man_allocation.unit_id',
        'product.name as product_name',
        'product.name_tamil as product_name_tamil',
        'product.code as product_code',
        'unit.name as unit_name',
        'product.default_unit_id'
      )
      .where({
        date,
        purchase_man_id: req.user.id
      })
      .andWhere('purchase_man_allocation.allocated_qty', '>', 0);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
