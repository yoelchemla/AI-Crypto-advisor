const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
    [req.user.id, JSON.stringify(interested_assets), investor_type, JSON.stringify(content_types)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save preferences' });
      }
      res.json({ message: 'Preferences saved successfully', id: this.lastID });
    }
  );
});

// Get market news from CryptoPanic API
router.get('/news', authenticateToken, async (req, res) => {
  try {
    // Get user preferences to filter news
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          // CryptoPanic API (free tier - no API key needed for public feed)
          const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params: {
              auth_token: process.env.CRYPTOPANIC_API_KEY || '',
              public: true,
              filter: 'hot',
              currencies: 'BTC,ETH'
            }
          });

          const news = response.data.results || [];
          res.json({ news: news.slice(0, 5) }); // Return top 5 news items
        } catch (apiError) {
          // Fallback to static news if API fails
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

// Get coin prices from CoinGecko API
router.get('/prices', authenticateToken, async (req, res) => {
  try {
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          // Default coins or from preferences
          let coins = ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'];
          if (preferences) {
            const assets = JSON.parse(preferences.interested_assets);
            coins = assets.slice(0, 5); // Limit to 5 coins
          }

          // CoinGecko API (free, no API key needed)
          const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
              ids: coins.join(','),
              vs_currencies: 'usd',
              include_24hr_change: true
            }
          });

          const prices = Object.entries(response.data).map(([id, data]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            price: data.usd,
            change_24h: data.usd_24h_change
          }));

          res.json({ prices });
        } catch (apiError) {
          res.status(500).json({ error: 'Failed to fetch prices' });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Get AI insight using OpenRouter or Hugging Face
router.get('/insight', authenticateToken, async (req, res) => {
  try {
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const investorType = preferences ? preferences.investor_type : 'General Investor';
          const contentTypes = preferences ? JSON.parse(preferences.content_types) : ['Market News'];

          // Try OpenRouter first (free tier available)
          if (process.env.OPENROUTER_API_KEY) {
            try {
              const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                  model: 'meta-llama/llama-3.2-3b-instruct:free',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are a crypto market analyst providing daily insights.'
                    },
                    {
                      role: 'user',
                      content: `Provide a brief daily crypto market insight for a ${investorType} interested in ${contentTypes.join(', ')}. Keep it under 100 words.`
                    }
                  ]
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const insight = response.data.choices[0].message.content;
              return res.json({ insight });
            } catch (openRouterError) {
              console.log('OpenRouter failed, trying fallback');
            }
          }

          // Fallback: Static insights based on investor type
          const staticInsights = {
            'HODLer': 'For HODLers: The market shows resilience. Long-term holders should focus on fundamentals and DCA strategies. Volatility is normal - stay the course.',
            'Day Trader': 'For Day Traders: Watch for key support/resistance levels. Volume indicators suggest increased activity. Consider tight stop-losses in current conditions.',
            'NFT Collector': 'For NFT Collectors: The NFT market is showing signs of recovery. Blue-chip collections remain stable. Watch for new drops from established artists.',
            'General Investor': 'Market analysis suggests cautious optimism. Diversification remains key. Keep an eye on regulatory developments and major exchange movements.'
          };

          res.json({
            insight: staticInsights[investorType] || staticInsights['General Investor']
          });
        } catch (error) {
          res.status(500).json({ error: 'Failed to generate insight' });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

// Get crypto meme
router.get('/meme', authenticateToken, async (req, res) => {
  try {
    // Try to get meme from Reddit API (free, no auth needed)
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
    } catch (redditError) {
      console.log('Reddit API failed, using fallback');
    }

    // Fallback: Static meme URLs
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

// Submit feedback (thumbs up/down)
router.post('/feedback', authenticateToken, (req, res) => {
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || vote === undefined) {
    return res.status(400).json({ error: 'content_type, content_id, and vote are required' });
  }

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 (up) or -1 (down)' });
  }

  db.run(
    'INSERT INTO feedback (user_id, content_type, content_id, vote) VALUES (?, ?, ?, ?)',
    [req.user.id, content_type, content_id, vote],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save feedback' });
      }
      res.json({ message: 'Feedback saved successfully', id: this.lastID });
    }
  );
});

module.exports = router;
