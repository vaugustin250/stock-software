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
      .select('pel.product_id', 'pel.qty_purchased')
      .where('purchase_entry.entry_date', report_date);

    // Get today's transfers
    const transfers = await db('transfer_entry')
      .join('transfer_entry_line as tel', 'transfer_entry.id', 'tel.transfer_entry_id')
      .select('tel.product_id', 'tel.qty_sent')
      .where('transfer_entry.transfer_date', report_date);

    // Get all products
    const products = await db('product').select('id', 'name', 'code', 'group_id');

    // Aggregate
    const ledger = products.map(p => {
      const purchased = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_purchased), 0);
      const transferred = transfers.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_sent), 0);
      
      return {
        product_id: p.id,
        product_code: p.code,
        product_name: p.name,
        purchased,
        transferred,
        balance: purchased - transferred
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
      .select('pel.product_id', 'pel.qty as qty_ordered')
      .where('po_entry.entry_date', report_date);

    // Get today's purchases
    const purchases = await db('purchase_entry')
      .join('purchase_entry_line as pel', 'purchase_entry.id', 'pel.purchase_entry_id')
      .select('pel.product_id', 'pel.qty_purchased')
      .where('purchase_entry.entry_date', report_date);

    // Get all products
    const products = await db('product').select('id', 'name', 'code', 'group_id');

    // Aggregate
    const variance = products.map(p => {
      const ordered = pos.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_ordered), 0);
      const purchased = purchases.filter(x => x.product_id === p.id).reduce((sum, curr) => sum + parseFloat(curr.qty_purchased), 0);
      
      return {
        product_id: p.id,
        product_code: p.code,
        product_name: p.name,
        ordered,
        purchased,
        variance: purchased - ordered
      };
    });

    res.json(variance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
