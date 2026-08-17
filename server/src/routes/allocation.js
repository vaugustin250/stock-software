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
      .where({ role: 'PURCHASE_MAN', active: true });

    // 2. Get combined Godown requirements for the day (from POs)
    const pos = await db('po_entry').where({ entry_date: date });
    const poIds = pos.map(p => p.id);

    let requirements = [];
    if (poIds.length > 0) {
      requirements = await db('po_entry_line')
        .join('product', 'po_entry_line.product_id', 'product.id')
        .join('unit', 'po_entry_line.unit_id', 'unit.id')
        .select('po_entry_line.product_id', 'product.name as product_name', 'product.name_tamil as product_name_tamil', 'unit.name as unit_name', 'po_entry_line.unit_id')
        .sum('po_entry_line.qty as total_qty')
        .whereIn('po_entry_id', poIds)
        .groupBy('po_entry_line.product_id', 'product.name', 'product.name_tamil', 'unit.name', 'po_entry_line.unit_id');
    }

    // 3. Get existing allocations for the day
    const allocations = await db('purchase_man_allocation').where({ date });

    // 4. Build Matrix
    // matrix: [ { product_id, product_name, total_qty, unit_id, unit_name, allocations: { [pm_id]: allocated_qty } } ]
    const matrix = requirements.map(req => {
      const prodAllocations = {};
      purchaseMen.forEach(pm => {
        const alloc = allocations.find(a => a.product_id === req.product_id && a.purchase_man_id === pm.id);
        prodAllocations[pm.id] = alloc ? parseFloat(alloc.allocated_qty) : 0;
      });
      return {
        ...req,
        total_qty: parseFloat(req.total_qty),
        allocations: prodAllocations
      };
    });

    res.json({ purchaseMen, matrix });
  } catch (err) {
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
