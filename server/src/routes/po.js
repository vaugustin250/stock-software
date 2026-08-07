const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /po/entry - Get today's PO for the logged-in branch
router.get('/entry', requireRole(['BRANCH', 'ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const branch_id = req.user.role === 'BRANCH' ? req.user.branch_id : req.query.branch_id;
    const entry_date = req.query.date || new Date().toISOString().split('T')[0];

    if (!branch_id) return res.status(400).json({ error: 'Branch ID required' });

    const po = await db('po_entry').where({ branch_id, entry_date }).first();
    if (!po) return res.json({ lines: [] });

    const lines = await db('po_entry_line')
      .join('product', 'po_entry_line.product_id', 'product.id')
      .select('po_entry_line.*', 'product.name as product_name', 'product.group_id')
      .where({ po_entry_id: po.id });

    res.json({ ...po, lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /po/entry - Upsert today's PO for the branch
router.post('/entry', requireRole(['BRANCH']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const { branch_id } = req.user;
    const entry_date = new Date().toISOString().split('T')[0];
    const { lines } = req.body; // Array of { product_id, unit_id, qty }

    let po = await trx('po_entry').where({ branch_id, entry_date }).first();

    if (po && po.status === 'LOCKED') {
      await trx.rollback();
      return res.status(400).json({ error: 'PO is locked for today' });
    }

    if (!po) {
      const [inserted] = await trx('po_entry')
        .insert({ branch_id, entry_date, created_by: req.user.id, status: 'SUBMITTED' })
        .returning('*');
      po = inserted;
    } else {
      // Clear existing lines to replace
      await trx('po_entry_line').where({ po_entry_id: po.id }).delete();
    }

    if (lines && lines.length > 0) {
      const linesToInsert = lines.filter(l => l.qty > 0).map(l => ({
        po_entry_id: po.id,
        product_id: l.product_id,
        unit_id: l.unit_id,
        qty: l.qty
      }));
      if (linesToInsert.length > 0) {
        await trx('po_entry_line').insert(linesToInsert);
      }
    }

    await trx.commit();
    res.json({ success: true, po_id: po.id });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

// GET /po/combined-report - Warehouse view of all branch POs
router.get('/combined-report', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const entry_date = req.query.date || new Date().toISOString().split('T')[0];

    // Get all branches that submitted a PO today
    const pos = await db('po_entry')
      .join('branch', 'po_entry.branch_id', 'branch.id')
      .select('po_entry.id', 'branch.id as branch_id', 'branch.code as branch_code')
      .where({ entry_date });

    if (pos.length === 0) return res.json({ columns: [], data: [] });

    const poIds = pos.map(p => p.id);

    // Fetch all lines
    const lines = await db('po_entry_line')
      .join('po_entry', 'po_entry_line.po_entry_id', 'po_entry.id')
      .join('product', 'po_entry_line.product_id', 'product.id')
      .select('po_entry.branch_id', 'product.id as product_id', 'product.name', 'po_entry_line.qty')
      .whereIn('po_entry_id', poIds);

    // Pivot the data: rows = product, columns = branch_id
    const pivot = {};
    lines.forEach(line => {
      if (!pivot[line.product_id]) {
        pivot[line.product_id] = { product_id: line.product_id, product_name: line.name, total: 0 };
        pos.forEach(p => pivot[line.product_id][`branch_${p.branch_id}`] = 0);
      }
      pivot[line.product_id][`branch_${line.branch_id}`] = parseFloat(line.qty);
      pivot[line.product_id].total += parseFloat(line.qty);
    });

    res.json({
      columns: pos.map(p => ({ id: p.branch_id, code: p.branch_code })),
      data: Object.values(pivot)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
