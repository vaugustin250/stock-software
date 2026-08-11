const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /transfer/entry - Get transfers to a specific branch for a date
router.get('/entry', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const transfer_date = req.query.date || new Date().toISOString().split('T')[0];
    const branch_id = req.query.branch_id;

    if (!branch_id) return res.status(400).json({ error: 'Branch ID required' });

    const transfer = await db('transfer_entry').where({ transfer_date, branch_id }).first();
    if (!transfer) return res.json({ lines: [] });

    const lines = await db('transfer_entry_line')
      .join('product', 'transfer_entry_line.product_id', 'product.id')
      .select('transfer_entry_line.*', 'product.name as product_name', 'product.group_id')
      .where({ transfer_entry_id: transfer.id });

    res.json({ ...transfer, lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /transfer/entry - Save transfers to a branch
router.post('/entry', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const transfer_date = req.body.date || new Date().toISOString().split('T')[0];
    const { branch_id, lines } = req.body; // Array of { product_id, unit_id, qty_sent }

    if (!branch_id) {
        await trx.rollback();
        return res.status(400).json({ error: 'Branch ID required' });
    }

    let transfer = await trx('transfer_entry').where({ transfer_date, branch_id }).first();

    if (!transfer) {
      const [inserted] = await trx('transfer_entry')
        .insert({ transfer_date, branch_id, created_by: req.user.id })
        .returning('*');
      transfer = inserted;
    } else {
      await trx('transfer_entry_line').where({ transfer_entry_id: transfer.id }).delete();
    }

    if (lines && lines.length > 0) {
      const linesToInsert = lines.filter(l => l.qty_sent > 0 || l.unit_qty > 0).map(l => ({
        transfer_entry_id: transfer.id,
        product_id: l.product_id,
        unit_id: l.unit_id,
        qty_sent: l.qty_sent,
        unit_qty: l.unit_qty || 0
      }));
      
      if (linesToInsert.length > 0) {
        await trx('transfer_entry_line').insert(linesToInsert);
      }
    }

    await trx.commit();
    res.json({ success: true, transfer_id: transfer.id });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
