const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /purchase/entry - Get today's purchase (or by date)
router.get('/entry', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const entry_date = req.query.date || new Date().toISOString().split('T')[0];

    const purchase = await db('purchase_entry').where({ entry_date }).first();
    if (!purchase) return res.json({ lines: [] });

    const lines = await db('purchase_entry_line')
      .join('product', 'purchase_entry_line.product_id', 'product.id')
      .select('purchase_entry_line.*', 'product.name as product_name', 'product.group_id')
      .where({ purchase_entry_id: purchase.id });

    res.json({ ...purchase, lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /purchase/entry - Save/update today's purchase
router.post('/entry', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const entry_date = req.body.date || new Date().toISOString().split('T')[0];
    const { lines } = req.body; // Array of { product_id, unit_id, qty_purchased, rate }

    let purchase = await trx('purchase_entry').where({ entry_date }).first();

    if (!purchase) {
      const [inserted] = await trx('purchase_entry')
        .insert({ entry_date, created_by: req.user.id })
        .returning('*');
      purchase = inserted;
    } else {
      // Clear existing lines to replace (simplest update logic for grid)
      await trx('purchase_entry_line').where({ purchase_entry_id: purchase.id }).delete();
    }

    if (lines && lines.length > 0) {
      const linesToInsert = lines.filter(l => l.qty_purchased > 0).map(l => ({
        purchase_entry_id: purchase.id,
        product_id: l.product_id,
        unit_id: l.unit_id,
        qty_purchased: l.qty_purchased,
        rate: l.rate || null
      }));
      
      if (linesToInsert.length > 0) {
        await trx('purchase_entry_line').insert(linesToInsert);
      }
    }

    await trx.commit();
    res.json({ success: true, purchase_id: purchase.id });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
