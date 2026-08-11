const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /reports/stock-ledger - Godown Stock Ledger (Purchased - Transferred = Balance)
router.get('/stock-ledger', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const report_date = req.query.date || new Date().toISOString().split('T')[0];

    // Get today's purchases
    const purchases = await db('purchase_entry')
      .join('purchase_entry_line as pel', 'purchase_entry.id', 'pel.purchase_entry_id')
      .select('pel.product_id', 'pel.qty_purchased', 'pel.unit_qty')
      .where('purchase_entry.entry_date', report_date);

    // Get today's transfers
    const transfers = await db('transfer_entry')
      .join('transfer_entry_line as tel', 'transfer_entry.id', 'tel.transfer_entry_id')
      .select('tel.product_id', 'tel.qty_sent', 'tel.unit_qty')
      .where('transfer_entry.transfer_date', report_date);

    // Get all products
    const products = await db('product').select('id', 'name', 'code', 'group_id');

    // Aggregate
    const ledger = products.map(p => {
      const purchased = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_purchased), 0);
      const purchased_unit_qty = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.unit_qty || 0), 0);
      const transferred = transfers.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_sent), 0);
      const transferred_unit_qty = transfers.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.unit_qty || 0), 0);
      
      return {
        product_id: p.id,
        product_code: p.code,
        product_name: p.name,
        purchased,
        purchased_unit_qty,
        transferred,
        transferred_unit_qty,
        balance: purchased - transferred,
        balance_unit_qty: purchased_unit_qty - transferred_unit_qty
      };
    });

    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/purchase-vs-ordered - Purchase vs Ordered variance report
router.get('/purchase-vs-ordered', requireRole(['ADMIN', 'WAREHOUSE', 'BRANCH']), async (req, res) => {
  try {
    const report_date = req.query.date || new Date().toISOString().split('T')[0];

    // Get today's branch POs
    const pos = await db('po_entry')
      .join('po_entry_line as pel', 'po_entry.id', 'pel.po_entry_id')
      .select('pel.product_id', 'pel.qty as qty_ordered', 'pel.unit_qty as unit_qty_ordered')
      .where('po_entry.entry_date', report_date);

    // Get today's purchases
    const purchases = await db('purchase_entry')
      .join('purchase_entry_line as pel', 'purchase_entry.id', 'pel.purchase_entry_id')
      .select('pel.product_id', 'pel.qty_purchased', 'pel.unit_qty as unit_qty_purchased')
      .where('purchase_entry.entry_date', report_date);

    // Get all products
    const products = await db('product').select('id', 'name', 'code', 'group_id');

    // Aggregate
    const variance = products.map(p => {
      const ordered = pos.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_ordered), 0);
      const ordered_unit_qty = pos.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.unit_qty_ordered || 0), 0);
      
      const purchased = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_purchased), 0);
      const purchased_unit_qty = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.unit_qty_purchased || 0), 0);
      
      return {
        product_id: p.id,
        product_code: p.code,
        product_name: p.name,
        ordered,
        ordered_unit_qty,
        purchased,
        purchased_unit_qty,
        variance: purchased - ordered,
        variance_unit_qty: purchased_unit_qty - ordered_unit_qty
      };
    });

    res.json(variance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /reports/dashboard-summary - High level analytics for Godown/Admin
router.get('/dashboard-summary', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const report_date = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Branch Order Status
    const allBranches = await db('branch').where({ type: 'BRANCH' });
    const todayPos = await db('po_entry').where({ entry_date: report_date });
    const todayTransfers = await db('transfer_entry').where({ transfer_date: report_date });

    const branches_ordered = todayPos.length;
    const branches_not_ordered = allBranches.length - branches_ordered;

    const branch_status = allBranches.map(b => {
      const po = todayPos.find(p => p.branch_id === b.id);
      const transfer = todayTransfers.find(t => t.branch_id === b.id);
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        has_ordered: !!po,
        has_sent: !!transfer
      };
    });

    const items_sent = todayTransfers.length;

    // 2. Purchased Items Today
    const purchased = await db('purchase_entry')
      .join('purchase_entry_line as pel', 'purchase_entry.id', 'pel.purchase_entry_id')
      .select('pel.product_id')
      .where('purchase_entry.entry_date', report_date)
      .groupBy('pel.product_id');
      
    const purchased_today = purchased.length;

    // 3. Short Products Alert (Ordered > 0, but Stock Balance <= 0 or Purchased = 0)
    // First, let's get products that have orders today
    const orderedLines = await db('po_entry')
      .join('po_entry_line as pel', 'po_entry.id', 'pel.po_entry_id')
      .select('pel.product_id')
      .sum('pel.qty as total_ordered')
      .where('po_entry.entry_date', report_date)
      .groupBy('pel.product_id');

    // Get stock balances
    const products = await db('product').select('id', 'name', 'code', 'stock_balance');
    
    const short_products = [];
    for (const order of orderedLines) {
      const p = products.find(prod => prod.id === order.product_id);
      if (!p) continue;
      
      const isPurchased = purchased.some(pur => pur.product_id === p.id);
      // It's short if it's ordered but balance is <= 0 AND we haven't purchased it today
      if (p.stock_balance <= 0 && !isPurchased) {
        short_products.push({
          id: p.id,
          name: p.name,
          code: p.code,
          ordered: parseFloat(order.total_ordered || 0),
          stock_balance: p.stock_balance
        });
      }
    }

    res.json({
      branches_ordered,
      branches_not_ordered,
      items_sent,
      purchased_today,
      branch_status,
      short_products
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
