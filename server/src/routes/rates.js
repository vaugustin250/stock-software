const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /rates - Get current rates for all products
router.get('/', requireRole(['ADMIN', 'WAREHOUSE', 'BRANCH']), async (req, res) => {
  try {
    const branch_id = req.user.role === 'BRANCH' ? req.user.branch_id : req.query.branch_id;
    
    // In a real system, you might fetch the latest rate_change per product
    // For now, let's mock the latest rates or just query a simpler latest view
    
    // Using a raw query to get the latest rate per product
    let query = `
      SELECT DISTINCT ON (product_id) *
      FROM rate_change
      ORDER BY product_id, changed_at DESC
    `;
    
    // If branch specific rates are needed we could filter by branch, but we assume global rates for this chain unless specified
    const { rows } = await db.raw(query);
    
    // Also fetch unacknowledged rates for this branch if BRANCH role
    let unacknowledged = [];
    if (req.user.role === 'BRANCH') {
      const acks = await db('rate_ack').where({ branch_id: req.user.branch_id }).select('rate_change_id');
      const ackIds = acks.map(a => a.rate_change_id);
      
      unacknowledged = rows.filter(r => !ackIds.includes(r.id)).map(r => r.id);
    }
    
    res.json({ rates: rows, unacknowledged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rates - Warehouse saves a new rate
router.post('/', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const { product_id, branch_id, rate } = req.body;
    
    // The branch_id here could be null if it applies to all branches, but for RPC we might save one per branch or one global
    const [inserted] = await db('rate_change')
      .insert({
        product_id,
        branch_id: branch_id || 1, // Fallback to godown branch id for global
        rate,
        changed_by: req.user.id
      })
      .returning('*');

    // EMIT socket event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('rate_changed', inserted);
    }

    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rates/ack - Branch acknowledges a rate change
router.post('/ack', requireRole(['BRANCH']), async (req, res) => {
  try {
    const { rate_change_id } = req.body;
    
    await db('rate_ack').insert({
      rate_change_id,
      branch_id: req.user.branch_id,
      acknowledged_by: req.user.id
    }).onConflict(['rate_change_id', 'branch_id']).ignore(); // PostgreSQL specific for unique constraint if we had one
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /rates/history/:product_id
router.get('/history/:product_id', requireRole(['ADMIN', 'WAREHOUSE', 'BRANCH']), async (req, res) => {
  try {
    const { product_id } = req.params;
    const history = await db('rate_change')
      .join('app_user', 'rate_change.changed_by', 'app_user.id')
      .select('rate_change.*', 'app_user.username as changed_by_name')
      .where({ product_id })
      .orderBy('changed_at', 'desc');
      
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /rates/weekly - Weekly pivot report
router.get('/weekly', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    // In a real system, we would generate a date range and pivot based on day of week
    // For now we'll return a mock structure that the UI can consume
    const mockData = [
      { product_name: 'Tomato', mon: 40, tue: 42, wed: 42, thu: 45, fri: 44, sat: 40 },
      { product_name: 'Onion', mon: 60, tue: 60, wed: 62, thu: 65, fri: 65, sat: 65 }
    ];
    res.json(mockData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
