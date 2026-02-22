const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
    console.error('CoinGecko Error:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to fetch prices from CoinGecko'
    });
  }
});

/* ===========================
   NEWS – CryptoCompare (Stable API)
=========================== */

router.get('/news', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN'
    );

    const news = response.data.Data.slice(0, 5);

    res.json({ news });

  } catch (error) {
    console.error('News API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/* ===========================
   MEME – Reddit
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
      return res.status(404).json({ error: 'No memes found' });
    }

    const randomPost =
      posts[Math.floor(Math.random() * posts.length)];

    res.json({
      url: randomPost.data.url,
      title: randomPost.data.title
    });

  } catch (error) {
    console.error('Meme API Error:', error.message);
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