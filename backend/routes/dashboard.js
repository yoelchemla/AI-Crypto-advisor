const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// simple cache to reduce rate limits
const cache = {
  prices: { ts: 0, data: null },
  news: { ts: 0, data: null },
  meme: { ts: 0, data: null }
};
const TTL_PRICES_MS = 30_000;
const TTL_NEWS_MS = 60_000;
const TTL_MEME_MS = 60_000;

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

/* ===========================
   PREFERENCES
=========================== */

router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.json(null);

      return res.json({
        ...row,
        interested_assets: safeJsonParse(row.interested_assets, []),
        content_types: safeJsonParse(row.content_types, [])
      });
    }
  );
});

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
      if (err) return res.status(500).json({ error: 'Failed to save preferences' });
      return res.json({ message: 'Preferences saved', id: this.lastID });
    }
  );
});

/* ===========================
   PRICES – CoinGecko FREE (REAL DATA)
   No API key needed.
=========================== */

router.get('/prices', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    if (cache.prices.data && (now - cache.prices.ts) < TTL_PRICES_MS) {
      return res.json(cache.prices.data);
    }

    const coins = ['bitcoin', 'ethereum', 'solana'];

    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          ids: coins.join(','),
          price_change_percentage: '24h'
        },
        timeout: 12000
      }
    );

    const prices = Array.isArray(response.data) ? response.data.map(coin => ({
      id: coin.id,
      name: coin.name,
      price: coin.current_price,
      change_24h: coin.price_change_percentage_24h
    })) : [];

    const payload = { prices };
    cache.prices = { ts: now, data: payload };
    return res.json(payload);
  } catch (error) {
    console.error('Prices error:', error.response?.status, error.response?.data || error.message);
    // fallback with last cache if exists
    if (cache.prices.data) return res.json(cache.prices.data);

    return res.json({
      prices: [],
      note: 'Prices temporarily unavailable'
    });
  }
});

/* ===========================
   NEWS – CryptoCompare (REAL DATA)
=========================== */

router.get('/news', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    if (cache.news.data && (now - cache.news.ts) < TTL_NEWS_MS) {
      return res.json(cache.news.data);
    }

    const response = await axios.get(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
      { timeout: 12000 }
    );

    const arr = response?.data?.Data;
    const newsArr = Array.isArray(arr) ? arr : [];

    const news = newsArr.slice(0, 5).map(n => ({
      title: n.title,
      url: n.url,
      published_at: n.published_on ? new Date(n.published_on * 1000).toISOString() : new Date().toISOString(),
      source: { title: n.source || 'CryptoCompare' }
    }));

    const payload = { news };
    cache.news = { ts: now, data: payload };
    return res.json(payload);
  } catch (error) {
    console.error('News error:', error.response?.status, error.response?.data || error.message);
    if (cache.news.data) return res.json(cache.news.data);

    return res.json({
      news: [],
      note: 'News temporarily unavailable'
    });
  }
});

/* ===========================
   INSIGHT
=========================== */

router.get('/insight', authenticateToken, (req, res) => {
  return res.json({
    insight: 'Crypto markets remain volatile. Diversify, manage risk, and stay informed.'
  });
});

/* ===========================
   MEME – Reddit (REAL DATA when possible)
=========================== */

router.get('/meme', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    if (cache.meme.data && (now - cache.meme.ts) < TTL_MEME_MS) {
      return res.json(cache.meme.data);
    }

    const response = await axios.get(
      'https://www.reddit.com/r/cryptomemes/hot.json',
      { params: { limit: 10 }, timeout: 12000 }
    );

    const posts = (response.data?.data?.children || [])
      .map(x => x.data)
      .filter(p => p && p.post_hint === 'image' && p.url);

    const payload = posts.length
      ? { url: posts[Math.floor(Math.random() * posts.length)].url, title: posts[Math.floor(Math.random() * posts.length)].title, source: 'Reddit' }
      : { url: 'https://i.imgur.com/0Z8FQvK.jpeg', title: 'Crypto Meme (fallback)', source: 'Static' };

    cache.meme = { ts: now, data: payload };
    return res.json(payload);
  } catch (error) {
    console.error('Meme error:', error.response?.status, error.response?.data || error.message);
    if (cache.meme.data) return res.json(cache.meme.data);

    return res.json({
      url: 'https://i.imgur.com/0Z8FQvK.jpeg',
      title: 'Crypto Meme (fallback)',
      source: 'Static'
    });
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
      if (err) return res.status(500).json({ error: 'Failed to save feedback' });
      return res.json({ message: 'Feedback saved', id: this.lastID });
    }
  );
});

module.exports = router;