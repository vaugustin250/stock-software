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
      ORDER BY product_id, created_at DESC
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
      .orderBy('created_at', 'desc');
      
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /rates/weekly - Weekly pivot report
router.get('/weekly', requireRole(['ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const dates = [];
    const formattedDates = [];
    
    // Generate last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      dates.push(iso);
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      // e.g., 'Mon', 'Tue'. Let's append the date so it looks nice: 'Mon 09'
      const dateNum = d.getDate().toString().padStart(2, '0');
      formattedDates.push(`${dayName} ${dateNum}`);
    }
    
    // Fetch all active products
    const products = await db('product').select('id', 'name').where('is_active', true);
    
    // Fetch rate changes
    const rateChanges = await db('rate_change')
      .where('created_at', '<=', `${dates[dates.length - 1]} 23:59:59`)
      .orderBy('created_at', 'asc');
      
    const rates = products.map(p => {
      const row = {
        product_id: p.id,
        product_name: p.name
      };
      
      const pChanges = rateChanges.filter(rc => rc.product_id === p.id);
      
      // For each date, find the effective rate at the end of that day
      dates.forEach(dateStr => {
        // We compare the date string in the local time effectively.
        const endOfDay = new Date(`${dateStr}T23:59:59`);
        
        let effectiveRate = null;
        for (const rc of pChanges) {
          if (new Date(rc.created_at) <= endOfDay) {
            effectiveRate = parseFloat(rc.rate);
          }
        }
        row[dateStr] = effectiveRate;
      });
      
      return row;
    });

    res.json({
      dates,
      formattedDates,
      rates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
