const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Simple in-memory cache (per Render instance)
 * Good enough for assignment/demo and reduces rate-limit errors.
 */
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function safeJsonParse(value, fallback) {
  try {
    if (value == null) return fallback;
    if (Array.isArray(value) || typeof value === 'object') return value;
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function shouldBypassCache(req) {
  return req.query.refresh === '1' || req.query.refresh === 'true';
}

// -------------------- Preferences --------------------

// Get user preferences
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, preferences) => {
      if (err) {
        console.error('Preferences DB error:', err);
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
        console.error('Save preferences DB error:', err);
        return res.status(500).json({ error: 'Failed to save preferences' });
      }

      // Clear user-specific cached data so new preferences are reflected immediately
      cache.delete(`prices:${req.user.id}`);
      cache.delete(`news:${req.user.id}`);
      cache.delete(`insight:${req.user.id}`);

      res.json({ message: 'Preferences saved successfully', id: this.lastID });
    }
  );
});

// -------------------- News --------------------

router.get('/news', authenticateToken, async (req, res) => {
  try {
    const cacheKey = `news:${req.user.id}`;
    if (!shouldBypassCache(req)) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('News preferences DB error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const assets = preferences
            ? safeJsonParse(preferences.interested_assets, [])
            : [];

          // Build currencies param (CryptoPanic expects symbols like BTC, ETH)
          const symbolMap = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            cardano: 'ADA',
            solana: 'SOL',
            polkadot: 'DOT',
            chainlink: 'LINK',
            avalanche: 'AVAX',
            polygon: 'MATIC',
            litecoin: 'LTC',
            dogecoin: 'DOGE'
          };

          const selectedSymbols = assets
            .map((a) => symbolMap[String(a).toLowerCase()])
            .filter(Boolean)
            .slice(0, 5);

          const currenciesParam =
            selectedSymbols.length > 0 ? selectedSymbols.join(',') : 'BTC,ETH';

          const params = {
            public: true,
            filter: 'hot',
            currencies: currenciesParam
          };

          // Only send auth_token if really exists (avoid weird free-tier behavior)
          if (process.env.CRYPTOPANIC_API_KEY && process.env.CRYPTOPANIC_API_KEY.trim()) {
            params.auth_token = process.env.CRYPTOPANIC_API_KEY.trim();
          }

          const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params,
            timeout: 8000
          });

          let items = response?.data?.results;

          // Some responses/errors can be objects instead of array
          if (!Array.isArray(items)) {
            throw new Error('CryptoPanic response.results is not an array');
          }

          const news = items.slice(0, 5).map((item, index) => ({
            id: item.id || `news-${index}`,
            title: item.title || 'Crypto market update',
            url: item.url || '#',
            published_at: item.published_at || new Date().toISOString(),
            source: {
              title: item.source?.title || 'CryptoPanic'
            }
          }));

          const payload = { news, note: news.length ? undefined : 'No news items found' };
          setCache(cacheKey, payload);
          return res.json(payload);
        } catch (apiError) {
          console.error('News error:', apiError?.response?.data || apiError.message);

          // Fallback real-looking items (not empty, so UI keeps working)
          const fallback = {
            news: [
              {
                id: 'fallback-news-1',
                title: 'Bitcoin market update (fallback)',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Fallback' }
              },
              {
                id: 'fallback-news-2',
                title: 'Ethereum ecosystem activity remains strong (fallback)',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Fallback' }
              }
            ],
            note: 'News temporarily unavailable (using fallback)'
          };

          setCache(cacheKey, fallback);
          return res.json(fallback);
        }
      }
    );
  } catch (error) {
    console.error('Failed to fetch news route error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// -------------------- Prices --------------------

router.get('/prices', authenticateToken, async (req, res) => {
  try {
    const cacheKey = `prices:${req.user.id}`;
    if (!shouldBypassCache(req)) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('Prices preferences DB error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          let coins = ['bitcoin', 'ethereum'];

          if (preferences) {
            const assets = safeJsonParse(preferences.interested_assets, []);
            if (Array.isArray(assets) && assets.length > 0) {
              coins = assets.slice(0, 5);
            }
          }

          // Determine endpoint + headers based on key type
          const hasKey =
            process.env.COINGECKO_API_KEY && process.env.COINGECKO_API_KEY.trim().length > 0;
          const key = hasKey ? process.env.COINGECKO_API_KEY.trim() : null;

          // If user uses DEMO key => MUST use api.coingecko.com (not pro-api)
          // If user uses PRO key => use pro-api.coingecko.com
          const isLikelyDemoKey =
            key && (key.toLowerCase().includes('demo') || process.env.COINGECKO_KEY_TYPE === 'demo');

          const baseUrl = !key
            ? 'https://api.coingecko.com/api/v3'
            : isLikelyDemoKey
              ? 'https://api.coingecko.com/api/v3'
              : 'https://pro-api.coingecko.com/api/v3';

          const headers = {};
          if (key) {
            if (isLikelyDemoKey) {
              headers['x-cg-demo-api-key'] = key;
            } else {
              headers['x-cg-pro-api-key'] = key;
            }
          }

          const response = await axios.get(`${baseUrl}/simple/price`, {
            params: {
              ids: coins.join(','),
              vs_currencies: 'usd',
              include_24hr_change: true
            },
            headers,
            timeout: 8000
          });

          const data = response.data || {};
          const entries = Object.entries(data);

          const prices = entries.map(([id, coinData]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            price: Number(coinData?.usd || 0),
            change_24h: Number(coinData?.usd_24h_change || 0)
          }));

          // If API returned empty object, fallback instead of empty UI
          if (!prices.length) {
            throw new Error('CoinGecko returned empty data');
          }

          const payload = { prices };
          setCache(cacheKey, payload);
          return res.json(payload);
        } catch (apiError) {
          console.error('CoinGecko error:', apiError?.response?.data || apiError.message);

          // Fallback with non-zero values so UI is visibly populated
          const fallback = {
            prices: [
              { id: 'bitcoin', name: 'Bitcoin', price: 64400, change_24h: -4.51 },
              { id: 'ethereum', name: 'Ethereum', price: 1854.44, change_24h: -4.57 }
            ],
            note: 'Prices temporarily unavailable (using fallback)'
          };

          setCache(cacheKey, fallback);
          return res.json(fallback);
        }
      }
    );
  } catch (error) {
    console.error('Failed to fetch prices route error:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// -------------------- Insight --------------------

router.get('/insight', authenticateToken, async (req, res) => {
  try {
    const cacheKey = `insight:${req.user.id}`;
    if (!shouldBypassCache(req)) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('Insight preferences DB error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const investorType = preferences ? preferences.investor_type : 'General Investor';
          const contentTypes = preferences
            ? safeJsonParse(preferences.content_types, ['Market News'])
            : ['Market News'];

          // Try OpenRouter if key exists
          if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
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
                      content: `Provide a short daily crypto market insight for a ${investorType} interested in ${Array.isArray(contentTypes) ? contentTypes.join(', ') : 'crypto updates'}. Keep it under 60 words.`
                    }
                  ]
                },
                {
                  headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 10000
                }
              );

              const insight =
                response?.data?.choices?.[0]?.message?.content?.trim() ||
                'Crypto markets remain volatile. Diversify, manage risk, and stay informed.';

              const payload = { insight };
              setCache(cacheKey, payload);
              return res.json(payload);
            } catch (openRouterError) {
              console.log('OpenRouter failed, using fallback:', openRouterError.message);
            }
          }

          const staticInsights = {
            HODLer:
              'For HODLers: Stay focused on long-term conviction, position sizing, and avoiding emotional reactions to short-term volatility.',
            'Day Trader':
              'For Day Traders: Watch momentum and volume confirmation, keep risk tight, and avoid overtrading during choppy sessions.',
            'NFT Collector':
              'For NFT Collectors: Track community engagement, liquidity, and creator consistency before chasing short-lived hype.',
            'DeFi Enthusiast':
              'For DeFi Enthusiasts: Prioritize protocol quality, smart-contract risk, and sustainable yield over headline APY.',
            'General Investor':
              'Crypto markets remain volatile. Diversify, manage risk, and stay informed.'
          };

          const payload = {
            insight: staticInsights[investorType] || staticInsights['General Investor']
          };
          setCache(cacheKey, payload);
          return res.json(payload);
        } catch (error) {
          console.error('Insight generation error:', error);
          return res.status(500).json({ error: 'Failed to generate insight' });
        }
      }
    );
  } catch (error) {
    console.error('Failed to generate insight route error:', error);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

// -------------------- Meme --------------------

router.get('/meme', authenticateToken, async (req, res) => {
  try {
    const cacheKey = `meme:${req.user.id}`;
    if (!shouldBypassCache(req)) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    try {
      const response = await axios.get('https://www.reddit.com/r/cryptomemes/hot.json', {
        params: { limit: 15 },
        timeout: 8000,
        headers: {
          'User-Agent': 'crypto-dashboard/1.0'
        }
      });

      const children = response?.data?.data?.children || [];
      const imagePosts = children
        .map((p) => p.data)
        .filter(
          (post) =>
            post &&
            (post.post_hint === 'image' ||
              /\.(jpg|jpeg|png|webp)$/i.test(post.url || ''))
        );

      if (imagePosts.length > 0) {
        const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
        const payload = {
          url: randomPost.url,
          title: randomPost.title || 'Crypto Meme',
          source: 'Reddit'
        };
        setCache(cacheKey, payload);
        return res.json(payload);
      }
    } catch (redditError) {
      console.log('Meme error:', redditError?.response?.status || redditError.message);
    }

    // Reliable static fallback image
    const fallback = {
      url: 'https://i.imgur.com/0Z8FQvK.jpeg',
      title: 'Crypto Meme (fallback)',
      source: 'Static'
    };

    setCache(cacheKey, fallback);
    res.json(fallback);
  } catch (error) {
    console.error('Failed to fetch meme route error:', error);
    res.status(500).json({ error: 'Failed to fetch meme' });
  }
});

// -------------------- Feedback --------------------

router.post('/feedback', authenticateToken, (req, res) => {
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || vote === undefined) {
    return res
      .status(400)
      .json({ error: 'content_type, content_id, and vote are required' });
  }

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 (up) or -1 (down)' });
  }

  db.run(
    'INSERT INTO feedback (user_id, content_type, content_id, vote) VALUES (?, ?, ?, ?)',
    [req.user.id, content_type, String(content_id), vote],
    function (err) {
      if (err) {
        console.error('Feedback DB error:', err);
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