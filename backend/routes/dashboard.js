const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Preferences
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, preferences) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(preferences || null);
    }
  );
});

router.post('/preferences', authenticateToken, (req, res) => {
  const { interested_assets, investor_type, content_types } = req.body;

  if (!interested_assets || !investor_type || !content_types) {
    return res.status(400).json({ error: 'All preference fields are required' });
  }

  db.run(
    'INSERT INTO user_preferences (user_id, interested_assets, investor_type, content_types) VALUES (?, ?, ?, ?)',
    [
      req.user.id,
      JSON.stringify(interested_assets),
      investor_type,
      JSON.stringify(content_types)
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to save preferences' });
      res.json({ message: 'Preferences saved successfully', id: this.lastID });
    }
  );
});

// Prices (Mock)
router.get('/prices', authenticateToken, (req, res) => {
  res.json({
    prices: [
      { id: 'bitcoin', name: 'Bitcoin', price: 65000, change_24h: 1.8 },
      { id: 'ethereum', name: 'Ethereum', price: 3200, change_24h: -0.6 },
      { id: 'solana', name: 'Solana', price: 145, change_24h: 3.1 }
    ]
  });
});

// News (Static)
router.get('/news', authenticateToken, (req, res) => {
  res.json({
    news: [
      {
        title: 'Bitcoin reaches new highs',
        url: '#',
        source: { title: 'Crypto News' }
      }
    ]
  });
});

// Insight (Static)
router.get('/insight', authenticateToken, (req, res) => {
  res.json({
    insight: 'Crypto markets remain volatile. Diversification and risk management are key.'
  });
});

// Meme (Static)
router.get('/meme', authenticateToken, (req, res) => {
  res.json({
    url: 'https://i.imgur.com/0Z8FQvK.jpeg',
    title: 'To the Moon!',
    source: 'Static'
  });
});

module.exports = router;
