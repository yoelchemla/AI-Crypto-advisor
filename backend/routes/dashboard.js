const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ===========================
   PREFERENCES
=========================== */

// GET preferences
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) return res.json(null);

      // return parsed arrays
      return res.json({
        ...row,
        interested_assets: safeJsonParse(row.interested_assets, []),
        content_types: safeJsonParse(row.content_types, [])
      });
    }
  );
});

// POST preferences
router.post('/preferences', authenticateToken, (req, res) => {
  const { interested_assets, investor_type, content_types } = req.body;

  if (!interested_assets || !investor_type || !content_types) {
    return res.status(400).json({ error: 'All preference fields are required' });
  }

  db.run(
    `INSERT INTO user_preferences
      (user_id, interested_assets, investor_type, content_types)
     VALUES (?, ?, ?, ?)`,
    [
      req.user.id,
      JSON.stringify(interested_assets),
      investor_type,
      JSON.stringify(content_types)
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save preferences' });
      }
      return res.json({ message: 'Preferences saved', id: this.lastID });
    }
  );
});

/* ===========================
   PRICES – CoinGecko Pro
=========================== */

router.get('/prices', authenticateToken, async (req, res) => {
  try {
    const coins = ['bitcoin', 'ethereum', 'solana'];

    const response = await axios.get(
      'https://pro-api.coingecko.com/api/v3/coins/markets',
      {
        headers: {
          'x-cg-pro-api-key': process.env.COINGECKO_API_KEY
        },
        params: {
          vs_currency: 'usd',
          ids: coins.join(','),
          price_change_percentage: '24h'
        },
        timeout: 10000
      }
    );

    const prices = response.data.map(coin => ({
      id: coin.id,
      name: coin.name,
      price: coin.current_price,
      change_24h: coin.price_change_percentage_24h
    }));

    return res.json({ prices });
  } catch (error) {
    console.error('CoinGecko error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

/* ===========================
   NEWS – CryptoCompare (stable)
=========================== */

router.get('/news', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
      { timeout: 10000 }
    );

    const news = (response.data?.Data || []).slice(0, 5);
    return res.json({ news });
  } catch (error) {
    console.error('News error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/* ===========================
   INSIGHT
=========================== */

router.get('/insight', authenticateToken, (req, res) => {
  return res.json({
    insight:
      'Crypto markets remain volatile. Diversify, manage risk, and stay informed.'
  });
});

/* ===========================
   MEME – Reddit (may rate limit)
=========================== */

router.get('/meme', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      'https://www.reddit.com/r/cryptomemes/hot.json',
      { params: { limit: 10 }, timeout: 10000 }
    );

    const posts = (response.data?.data?.children || [])
      .map(x => x.data)
      .filter(p => p && p.post_hint === 'image' && p.url);

    if (!posts.length) {
      return res.status(404).json({ error: 'No memes found' });
    }

    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    return res.json({ url: randomPost.url, title: randomPost.title, source: 'Reddit' });
  } catch (error) {
    console.error('Meme error:', error.response?.status || error.message);
    return res.status(500).json({ error: 'Failed to fetch meme' });
  }
});

/* ===========================
   FEEDBACK
=========================== */

router.post('/feedback', authenticateToken, (req, res) => {
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || vote === undefined) {
    return res.status(400).json({ error: 'content_type, content_id and vote are required' });
  }
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'vote must be 1 or -1' });
  }

  db.run(
    `INSERT INTO feedback (user_id, content_type, content_id, vote)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, content_type, content_id, vote],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save feedback' });
      }
      return res.json({ message: 'Feedback saved', id: this.lastID });
    }
  );
});

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = router;