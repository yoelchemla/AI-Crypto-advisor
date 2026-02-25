const express = require('express');
const axios = require('axios');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Simple in-memory cache (per Render instance)
 * Helps avoid rate limits and keeps dashboard responsive.
 */
const cache = {
  prices: { data: null, expiresAt: 0 },
  news: { data: null, expiresAt: 0 },
  meme: { data: null, expiresAt: 0 },
};

const CACHE_TTL = {
  prices: 60 * 1000, // 60s
  news: 90 * 1000,   // 90s
  meme: 30 * 1000,   // 30s
};

function getCached(key) {
  const item = cache[key];
  if (!item) return null;
  if (Date.now() < item.expiresAt) return item.data;
  return null;
}

function setCached(key, data, ttlMs) {
  cache[key] = {
    data,
    expiresAt: Date.now() + ttlMs,
  };
}

function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCoinName(id) {
  if (!id || typeof id !== 'string') return 'Unknown';
  return id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function pickCoinIdsFromPreferences(preferences) {
  const defaultCoins = ['bitcoin', 'ethereum'];
  if (!preferences) return defaultCoins;

  const assets = safeJsonParse(preferences.interested_assets, []);
  if (!Array.isArray(assets) || assets.length === 0) return defaultCoins;

  // CoinGecko IDs expected (your onboarding already uses lowercase ids)
  return assets.slice(0, 5);
}

// ----------------------
// Preferences
// ----------------------
router.get('/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.user.id],
    (err, preferences) => {
      if (err) {
        console.error('Preferences GET DB error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json(preferences || null);
    }
  );
});

router.post('/preferences', authenticateToken, (req, res) => {
  const { interested_assets, investor_type, content_types } = req.body;

  if (
    !Array.isArray(interested_assets) ||
    interested_assets.length === 0 ||
    !investor_type ||
    !Array.isArray(content_types) ||
    content_types.length === 0
  ) {
    return res.status(400).json({ error: 'All preference fields are required' });
  }

  db.run(
    'INSERT INTO user_preferences (user_id, interested_assets, investor_type, content_types) VALUES (?, ?, ?, ?)',
    [req.user.id, JSON.stringify(interested_assets), investor_type, JSON.stringify(content_types)],
    function (err) {
      if (err) {
        console.error('Preferences POST DB error:', err.message);
        return res.status(500).json({ error: 'Failed to save preferences' });
      }

      return res.json({
        message: 'Preferences saved successfully',
        id: this.lastID,
      });
    }
  );
});

// ----------------------
// News (CryptoPanic free/public + fallback)
// ----------------------
router.get('/news', authenticateToken, async (req, res) => {
  try {
    const cached = getCached('news');
    if (cached) {
      return res.json(cached);
    }

    // Optional: read user prefs (not required for basic response)
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('News DB error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          // CryptoPanic public feed. auth_token optional. If not set, public may still work depending on endpoint behavior.
          const params = {
            public: true,
            filter: 'hot',
          };

          if (process.env.CRYPTOPANIC_API_KEY) {
            params.auth_token = process.env.CRYPTOPANIC_API_KEY;
          }

          const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params,
            timeout: 8000,
          });

          const rawResults = response?.data?.results;
          const results = Array.isArray(rawResults) ? rawResults : [];

          let news = results.slice(0, 5).map((item, idx) => ({
            id: item.id || `news-${idx}`,
            title: item.title || 'Crypto News Update',
            url: item.url || item.domain || '#',
            published_at: item.published_at || new Date().toISOString(),
            source: {
              title: item?.source?.title || item.domain || 'CryptoPanic',
            },
          }));

          // If response shape is unexpected / empty -> fallback
          if (!news.length) {
            throw new Error('CryptoPanic returned empty or unexpected format');
          }

          const payload = { news };
          setCached('news', payload, CACHE_TTL.news);
          return res.json(payload);
        } catch (apiError) {
          console.error('News API error:', apiError.response?.data || apiError.message);

          const fallback = {
            news: [
              {
                id: 'fallback-news-1',
                title: 'Bitcoin market update (fallback)',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Fallback' },
              },
              {
                id: 'fallback-news-2',
                title: 'Ethereum ecosystem activity remains strong (fallback)',
                url: '#',
                published_at: new Date().toISOString(),
                source: { title: 'Fallback' },
              },
            ],
            note: 'News temporarily unavailable - showing fallback items',
          };

          setCached('news', fallback, 20 * 1000);
          return res.json(fallback);
        }
      }
    );
  } catch (error) {
    console.error('News route error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// ----------------------
// Prices (CoinGecko FREE endpoint + fallback)
// ----------------------
router.get('/prices', authenticateToken, async (req, res) => {
  try {
    const cached = getCached('prices');
    if (cached) {
      return res.json(cached);
    }

    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('Prices DB error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const coins = pickCoinIdsFromPreferences(preferences);

          // IMPORTANT: Free endpoint (NOT pro-api)
          const coingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price';

          const response = await axios.get(coingeckoUrl, {
            params: {
              ids: coins.join(','),
              vs_currencies: 'usd',
              include_24hr_change: true,
            },
            headers: {
              // If you have a demo key, some users try to send it. Free endpoint is still api.coingecko.com.
              ...(process.env.COINGECKO_API_KEY
                ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
                : {}),
            },
            timeout: 8000,
          });

          const data = response?.data || {};
          const prices = coins.map((id) => {
            const item = data[id] || {};
            return {
              id,
              name: normalizeCoinName(id),
              price: typeof item.usd === 'number' ? item.usd : 0,
              change_24h:
                typeof item.usd_24h_change === 'number' ? item.usd_24h_change : 0,
            };
          });

          const hasAnyRealPrice = prices.some((p) => p.price > 0);

          if (!hasAnyRealPrice) {
            throw new Error('CoinGecko returned no usable price data');
          }

          const payload = { prices };
          setCached('prices', payload, CACHE_TTL.prices);
          return res.json(payload);
        } catch (apiError) {
          console.error('CoinGecko error:', apiError.response?.data || apiError.message);

          // Fallback with empty array (frontend should handle "No price data available")
          // Better than 500 - dashboard still loads.
          const fallback = {
            prices: [],
            note: 'Prices temporarily unavailable',
          };
          setCached('prices', fallback, 15 * 1000);
          return res.json(fallback);
        }
      }
    );
  } catch (error) {
    console.error('Prices route error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// ----------------------
// Insight (OpenRouter optional + fallback)
// ----------------------
router.get('/insight', authenticateToken, async (req, res) => {
  try {
    db.get(
      'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
      async (err, preferences) => {
        if (err) {
          console.error('Insight DB error:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }

        try {
          const investorType = preferences?.investor_type || 'General Investor';
          const contentTypes = safeJsonParse(preferences?.content_types, ['Market News']);

          if (process.env.OPENROUTER_API_KEY) {
            try {
              const aiResponse = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                  model: 'meta-llama/llama-3.2-3b-instruct:free',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are a crypto market analyst. Keep answers concise and practical.',
                    },
                    {
                      role: 'user',
                      content: `Give a short daily crypto insight (max 80 words) for a ${investorType} interested in ${Array.isArray(contentTypes) ? contentTypes.join(', ') : 'crypto markets'}.`,
                    },
                  ],
                },
                {
                  headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  timeout: 10000,
                }
              );

              const insight = aiResponse?.data?.choices?.[0]?.message?.content;
              if (insight && typeof insight === 'string') {
                return res.json({ insight });
              }
            } catch (openRouterError) {
              console.error('OpenRouter error:', openRouterError.response?.data || openRouterError.message);
            }
          }

          // Fallback insight (always works)
          const staticInsights = {
            HODLer:
              'For HODLers: Stay focused on long-term conviction, position sizing, and avoiding emotional reactions to short-term volatility.',
            'Day Trader':
              'For Day Traders: Watch liquidity, volatility spikes, and key levels. Tight risk management matters more than prediction.',
            'NFT Collector':
              'For NFT Collectors: Focus on community strength, liquidity, and creator consistency rather than hype-only launches.',
            'DeFi Enthusiast':
              'For DeFi Enthusiasts: Track protocol updates, TVL trends, and smart-contract risk before chasing yields.',
            'General Investor':
              'Crypto markets remain volatile. Diversify, manage risk, and stay informed.',
          };

          return res.json({
            insight: staticInsights[investorType] || staticInsights['General Investor'],
          });
        } catch (innerError) {
          console.error('Insight generation error:', innerError.message);
          return res.status(500).json({ error: 'Failed to generate insight' });
        }
      }
    );
  } catch (error) {
    console.error('Insight route error:', error.message);
    return res.status(500).json({ error: 'Failed to generate insight' });
  }
});

// ----------------------
// Meme (Reddit + fallback)
// ----------------------
router.get('/meme', authenticateToken, async (req, res) => {
  try {
    const cached = getCached('meme');
    if (cached) {
      return res.json(cached);
    }

    try {
      const response = await axios.get('https://www.reddit.com/r/cryptomemes/hot.json', {
        params: { limit: 15 },
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 CryptoDashboard/1.0',
        },
      });

      const posts = response?.data?.data?.children || [];
      const imagePosts = Array.isArray(posts)
        ? posts
            .map((p) => p?.data)
            .filter(Boolean)
            .filter((p) => {
              const url = p.url_overridden_by_dest || p.url || '';
              return (
                typeof url === 'string' &&
                (url.endsWith('.jpg') ||
                  url.endsWith('.jpeg') ||
                  url.endsWith('.png') ||
                  url.includes('i.redd.it') ||
                  url.includes('imgur.com'))
              );
            })
        : [];

      if (imagePosts.length > 0) {
        const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
        const payload = {
          url: randomPost.url_overridden_by_dest || randomPost.url,
          title: randomPost.title || 'Crypto Meme',
          source: 'Reddit',
        };
        setCached('meme', payload, CACHE_TTL.meme);
        return res.json(payload);
      }

      throw new Error('No image meme posts found');
    } catch (redditError) {
      console.error('Meme error:', redditError.response?.status || redditError.message);

      const fallbackMemes = [
        {
          url: 'https://i.imgur.com/0Z8FQvK.jpeg',
          title: 'Crypto Meme (fallback)',
          source: 'Static',
        },
        {
          url: 'https://i.imgur.com/4M7IWwP.jpeg',
          title: 'HODL Meme (fallback)',
          source: 'Static',
        },
      ];

      const payload = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
      setCached('meme', payload, CACHE_TTL.meme);
      return res.json(payload);
    }
  } catch (error) {
    console.error('Meme route error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch meme' });
  }
});

// ----------------------
// Feedback
// ----------------------
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
    [req.user.id, content_type, content_id, vote],
    function (err) {
      if (err) {
        console.error('Feedback DB error:', err.message);
        return res.status(500).json({ error: 'Failed to save feedback' });
      }

      return res.json({
        message: 'Feedback saved successfully',
        id: this.lastID,
      });
    }
  );
});

module.exports = router; 