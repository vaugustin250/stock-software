const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /receiving/pending - Get pending transfers for a branch
router.get('/pending', requireRole(['BRANCH', 'ADMIN', 'WAREHOUSE']), async (req, res) => {
  try {
    const branch_id = req.user.role === 'BRANCH' ? req.user.branch_id : req.query.branch_id;
    const transfer_date = req.query.date || new Date().toISOString().split('T')[0];

    if (!branch_id) return res.status(400).json({ error: 'Branch ID required' });

    // Find transfer for this branch and date
    const transfer = await db('transfer_entry').where({ branch_id, transfer_date }).first();
    if (!transfer) return res.json({ transfer: null, lines: [] });

    // See if receiving already exists
    const receiving = await db('receiving_entry').where({ transfer_entry_id: transfer.id }).first();
    
    // Fetch transfer lines and left join receiving lines
    const lines = await db('transfer_entry_line as tel')
      .join('product as p', 'tel.product_id', 'p.id')
      .leftJoin('receiving_entry_line as rel', function() {
        this.on('tel.id', '=', 'rel.transfer_entry_line_id');
        if (receiving) {
          this.andOnVal('rel.receiving_entry_id', '=', receiving.id);
        } else {
            this.andOnVal('rel.receiving_entry_id', '=', -1); // Force false if no receiving entry
        }
      })
      .select(
        'tel.id as transfer_entry_line_id', 
        'tel.qty_sent', 
        'p.id as product_id',
        'p.name as product_name', 
        'p.group_id',
        'rel.qty_received'
      )
      .where({ 'tel.transfer_entry_id': transfer.id });

    res.json({ transfer, receiving, lines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /receiving/confirm - Branch confirms receipt
router.post('/confirm', requireRole(['BRANCH']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const { transfer_entry_id, lines } = req.body; // Array of { transfer_entry_line_id, qty_received }
    
    // Verify transfer belongs to branch
    const transfer = await trx('transfer_entry').where({ id: transfer_entry_id, branch_id: req.user.branch_id }).first();
    if (!transfer) {
        await trx.rollback();
        return res.status(403).json({ error: 'Transfer not found or belongs to another branch' });
    }

    let receiving = await trx('receiving_entry').where({ transfer_entry_id }).first();

    if (!receiving) {
      const [inserted] = await trx('receiving_entry')
        .insert({ transfer_entry_id, confirmed_by: req.user.id })
        .returning('*');
      receiving = inserted;
    } else {
      await trx('receiving_entry_line').where({ receiving_entry_id: receiving.id }).delete();
    }

    if (lines && lines.length > 0) {
      const linesToInsert = lines.map(l => ({
        receiving_entry_id: receiving.id,
        transfer_entry_line_id: l.transfer_entry_line_id,
        qty_received: l.qty_received
      }));
      
      await trx('receiving_entry_line').insert(linesToInsert);
    }

    await trx.commit();
    res.json({ success: true, receiving_id: receiving.id });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
