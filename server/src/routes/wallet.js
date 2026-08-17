const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');

const handleDbError = (err, res) => {
  console.error(err);
  res.status(500).json({ error: 'Database error occurred' });
};

// 1. Godown gives money to a Purchase Man (CREDIT)
router.post('/add-funds', requireRole(['WAREHOUSE', 'ADMIN']), async (req, res) => {
  const trx = await db.transaction();
  try {
    const { user_id, amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      await trx.rollback();
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const [tx] = await trx('wallet_transaction').insert({
      user_id,
      amount: amount,
      type: 'CREDIT',
      description: description || 'Cash from Godown',
      created_by: req.user.id
    }).returning('*');

    // Update profile balance
    await trx('purchase_man_profile')
      .where({ user_id })
      .increment('balance', amount);

    await trx.commit();
    res.json(tx);
  } catch (err) {
    await trx.rollback();
    return handleDbError(err, res);
  }
});

// 2. Get transaction history for a purchase man
router.get('/history/:userId', requireRole(['WAREHOUSE', 'ADMIN', 'PURCHASE_MAN']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // If it's a purchase man, they can only see their own history
    if (req.user.role === 'PURCHASE_MAN' && req.user.id != userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const history = await db('wallet_transaction')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
      
    res.json(history);
  } catch (err) {
    return handleDbError(err, res);
  }
});

// 3. Get current balance
router.get('/balance/:userId', requireRole(['WAREHOUSE', 'ADMIN', 'PURCHASE_MAN']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.role === 'PURCHASE_MAN' && req.user.id != userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const profile = await db('purchase_man_profile').where({ user_id: userId }).first();
    res.json({ balance: profile ? profile.balance : 0 });
  } catch (err) {
    return handleDbError(err, res);
  }
});

module.exports = router;
