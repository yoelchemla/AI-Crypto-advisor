const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ===========================
   Small in-memory cache (reduce rate limits)
=========================== */
const cache = {
  prices: { ts: 0, data: null },
  news: { ts: 0, data: null },
  meme: { ts: 0, data: null }
};
const TTL_PRICES_MS = 30_000; // 30s
const TTL_NEWS_MS = 60_000;   // 60s
const TTL_MEME_MS = 60_000;   // 60s

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
   PRICES – CoinGecko (Demo/Free/Pro safe)
   IMPORTANT:
   - Demo key MUST use api.coingecko.com (not pro-api)
   - Pro key can use pro-api, but api endpoint also works.
=========================== */

router.get('/prices', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    if (cache.prices.data && (now - cache.prices.ts) < TTL_PRICES_MS) {
      return res.json(cache.prices.data);
    }

    // If user has preferences, you can use them; keep it simple & stable:
    const coins = ['bitcoin', 'ethereum', 'solana'];

    // Use non-pro base URL by default (works with demo/free keys)
    const baseUrl = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';

    const headers = {};
    // CoinGecko supports keys via header on some plans; harmless if ignored:
    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = process.env.COINGECKO_API_KEY;
      // some docs use: x-cg-demo-api-key
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const response = await axios.get(
      `${baseUrl}/coins/markets`,
      {
        headers,
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
    console.error('CoinGecko prices error:', error.response?.status, error.response?.data || error.message);

    // Do NOT return 500 that kills UI; return fallback payload
    const fallback = {
      prices: [
        { id: 'bitcoin', name: 'Bitcoin', price: 0, change_24h: 0 },
        { id: 'ethereum', name: 'Ethereum', price: 0, change_24h: 0 }
      ],
      note: 'Prices temporarily unavailable (fallback).'
    };
    return res.json(fallback);
  }
});

/* ===========================
   NEWS – CryptoCompare (safe parse + fallback)
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

    // fallback (no 500)
    return res.json({
      news: [
        {
          title: 'News temporarily unavailable (fallback)',
          url: '#',
          published_at: new Date().toISOString(),
          source: { title: 'Fallback' }
        }
      ]
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
   MEME – Reddit (cache + fallback for 429)
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

    let payload;
    if (posts.length) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      payload = { url: randomPost.url, title: randomPost.title, source: 'Reddit' };
    } else {
      payload = { url: 'https://i.imgur.com/0Z8FQvK.jpeg', title: 'Crypto Meme (fallback)', source: 'Static' };
    }

    cache.meme = { ts: now, data: payload };
    return res.json(payload);
  } catch (error) {
    console.error('Meme error:', error.response?.status, error.response?.data || error.message);

    // fallback (no 500)
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