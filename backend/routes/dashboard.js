const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ===========================
   USER PREFERENCES
=========================== */

// Get user preferences
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, preferences) => {
      if (err) {
        console.error(err);
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
    return res.status(400).json({
      error: 'All preference fields are required'
    });
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

      res.json({
        message: 'Preferences saved successfully',
        id: this.lastID
      });
    }
  );
});


/* ===========================
   MARKET NEWS (CryptoPanic)
=========================== */

router.get('/news', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      'https://cryptopanic.com/api/v1/posts/',
      {
        params: {
          public: true,
          filter: 'hot'
        }
      }
    );

    const news = response.data.results
      ? response.data.results.slice(0, 5)
      : [];

    res.json({ news });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});


/* ===========================
   PRICES (CoinGecko – Real API)
=========================== */

router.get('/prices', authenticateToken, async (req, res) => {
  try {
    let coins = ['bitcoin', 'ethereum', 'solana'];

    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          ids: coins.join(','),
          price_change_percentage: '24h'
        }
      }
    );

    const prices = response.data.map(coin => ({
      id: coin.id,
      name: coin.name,
      price: coin.current_price,
      change_24h: coin.price_change_percentage_24h
    }));

    res.json({ prices });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});


/* ===========================
   AI INSIGHT
=========================== */

router.get('/insight', authenticateToken, async (req, res) => {
  try {
    const staticInsight =
      'Crypto markets remain volatile. Consider risk management strategies and stay diversified.';

    res.json({ insight: staticInsight });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});


/* ===========================
   MEME (Reddit)
=========================== */

router.get('/meme', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      'https://www.reddit.com/r/cryptomemes/hot.json',
      { params: { limit: 10 } }
    );

    const posts = response.data.data.children
      .filter(post => post.data.post_hint === 'image');

    if (!posts.length) {
      return res.status(500).json({ error: 'No memes found' });
    }

    const randomPost =
      posts[Math.floor(Math.random() * posts.length)];

    res.json({
      url: randomPost.data.url,
      title: randomPost.data.title,
      source: 'Reddit'
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch meme' });
  }
});


/* ===========================
   FEEDBACK
=========================== */

router.post('/feedback', authenticateToken, (req, res) => {
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || vote === undefined) {
    return res.status(400).json({
      error: 'content_type, content_id and vote are required'
    });
  }

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({
      error: 'vote must be 1 or -1'
    });
  }

  db.run(
    `INSERT INTO feedback 
     (user_id, content_type, content_id, vote) 
     VALUES (?, ?, ?, ?)`,
    [req.user.id, content_type, content_id, vote],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save feedback' });
      }

      res.json({
        message: 'Feedback saved successfully',
        id: this.lastID
      });
    }
  );
});

module.exports = router;
