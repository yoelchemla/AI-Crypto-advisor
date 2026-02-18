const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* =========================
   Preferences
========================= */

// Get user preferences
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, preferences) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(preferences || null);
    }
  );
});

// Save onboarding preferences
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
      if (err) {
        return res.status(500).json({ error: 'Failed to save preferences' });
      }
      res.json({ message: 'Preferences saved successfully', id: this.lastID });
    }
  );
});

/* =========================
   News
========================= */

router.get('/news', authenticateToken, async (req, res) => {
  try {
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params: {
              auth_token: process.env.CRYPTOPANIC_API_KEY || '',
              public: true,
              filter: 'hot',
              currencies: 'BTC,ETH'
            }
          });

          const news = response.data.results || [];
          res.json({ news: news.slice(0, 5) });
        } catch (apiError) {
          res.json({
            news: [
              {
                title: 'Bitcoin reaches new highs',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Crypto News' }
              },
              {
                title: 'Ethereum upgrade successful',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Crypto News' }
              }
            ]
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/* =========================
   Prices (MOCK – production safe)
========================= */

router.get('/prices', authenticateToken, (req, res) => {
  res.json({
    prices: [
      {
        id: 'bitcoin',
        name: 'Bitcoin',
        price: 65000,
        change_24h: 1.8
      },
      {
        id: 'ethereum',
        name: 'Ethereum',
        price: 3200,
        change_24h: -0.6
      },
      {
        id: 'solana',
        name: 'Solana',
        price: 145,
        change_24h: 3.1
      }
    ]
  });
});

/* =========================
   Insight
========================= */

router.get('/insight', authenticateToken, async (req, res) => {
  try {
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const investorType = preferences ? preferences.investor_type : 'General Investor';

        const staticInsights = {
          HODLer:
            'For HODLers: Long-term fundamentals remain strong. Consider DCA and ignore short-term volatility.',
          'Day Trader':
            'For Day Traders: Increased volatility detected. Watch support and resistance levels closely.',
          'NFT Collector':
            'NFT markets are stabilizing. Blue-chip collections show resilience.',
          'General Investor':
            'Diversification remains key. Stay updated on macro trends and regulatory news.'
        };

        res.json({
          insight: staticInsights[investorType] || staticInsights['General Investor']
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

/* =========================
   Meme
========================= */

router.get('/meme', authenticateToken, async (req, res) => {
  try {
    try {
      const response = await axios.get('https://www.reddit.com/r/cryptomemes/hot.json', {
        params: { limit: 10 }
      });

      const posts = response.data.data.children
        .filter(post => post.data.post_hint === 'image')
        .slice(0, 5);

      if (posts.length > 0) {
        const randomPost = posts[Math.floor(Math.random() * posts.length)];
        return res.json({
          url: randomPost.data.url,
          title: randomPost.data.title,
          source: 'Reddit'
        });
      }
    } catch (redditError) {}

    const fallbackMemes = [
      {
        url: 'https://i.imgur.com/example1.jpg',
        title: 'HODL Strong!',
        source: 'Static'
      },
      {
        url: 'https://i.imgur.com/example2.jpg',
        title: 'To the Moon!',
        source: 'Static'
      }
    ];

    res.json(fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meme' });
  }
});

/* =========================
   Feedback
========================= */

router.post('/feedback', authenticateToken, (req, res) => {
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || vote === undefined) {
    return res.status(400).json({ error: 'content_type, content_id, and vote are required' });
  }

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }

  db.run(
    'INSERT INTO feedback (user_id, content_type, content_id, vote) VALUES (?, ?, ?, ?)',
    [req.user.id, content_type, content_id, vote],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save feedback' });
      }
      res.json({ message: 'Feedback saved successfully', id: this.lastID });
    }
  );
});

module.exports = router;
