import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [news, setNews] = useState([]);
  const [insight, setInsight] = useState('');
  const [meme, setMeme] = useState(null);
  const [error, setError] = useState('');

  const fetchPricesClient = async () => {
    const coins = ['bitcoin', 'ethereum', 'solana'];
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coins.join(
      ','
    )}&price_change_percentage=24h`;

    const res = await fetch(url);
    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id,
      name: c.name,
      price: c.current_price,
      change_24h: c.price_change_percentage_24h,
    }));
  };

  const fetchNewsClient = async () => {
    const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`;
    const res = await fetch(url);
    const data = await res.json();
    const arr = data?.Data;
    const list = Array.isArray(arr) ? arr : [];
    return list.slice(0, 5).map((n) => ({
      title: n.title,
      url: n.url,
      source: { title: n.source || 'CryptoCompare' },
    }));
  };

  const fetchMemeClient = async () => {
    const url = `https://www.reddit.com/r/cryptomemes/hot.json?limit=10`;
    const res = await fetch(url);
    const data = await res.json();

    const posts = (data?.data?.children || [])
      .map((x) => x.data)
      .filter((p) => p && p.post_hint === 'image' && p.url);

    if (!posts.length) return null;

    const pick = posts[Math.floor(Math.random() * posts.length)];
    return { url: pick.url, title: pick.title, source: 'Reddit' };
  };

  const fetchInsightBackend = async () => {
    const res = await api.get('/dashboard/insight');
    return res.data?.insight || '';
  };

  const sendFeedback = async (content_type, content_id, vote) => {
    try {
      await api.post('/dashboard/feedback', { content_type, content_id, vote });
    } catch (e) {
      console.error('Feedback failed', e?.response?.data || e?.message);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const results = await Promise.allSettled([
      fetchPricesClient(),
      fetchNewsClient(),
      fetchMemeClient(),
      fetchInsightBackend(),
    ]);

    const [p, n, m, i] = results;

    if (p.status === 'fulfilled') setPrices(p.value);
    else setPrices([]);

    if (n.status === 'fulfilled') setNews(n.value);
    else setNews([]);

    if (m.status === 'fulfilled') setMeme(m.value);
    else setMeme(null);

    if (i.status === 'fulfilled') setInsight(i.value);
    else
      setInsight(
        'Crypto markets remain volatile. Diversify, manage risk, and stay informed.'
      );

    if (p.status === 'rejected' || n.status === 'rejected') {
      setError('Some live data sources are unavailable right now.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Daily Dashboard</h1>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="dashboard-grid">
        <div className="card">
          <h2>💰 Coin Prices</h2>
          {prices.length === 0 ? (
            <p>No price data available.</p>
          ) : (
            <ul className="prices-list">
              {prices.map((c) => (
                <li key={c.id} className="price-item">
                  <strong>{c.name}</strong> — ${c.price}{' '}
                  {typeof c.change_24h === 'number' && (
                    <span className={c.change_24h >= 0 ? 'pos' : 'neg'}>
                      ({c.change_24h.toFixed(2)}%)
                    </span>
                  )}
                  <span style={{ marginLeft: 10 }}>
                    <button onClick={() => sendFeedback('price', c.id, 1)}>
                      👍
                    </button>
                    <button onClick={() => sendFeedback('price', c.id, -1)}>
                      👎
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>📰 Market News</h2>
          {news.length === 0 ? (
            <p>No news available at the moment.</p>
          ) : (
            <ul className="news-list">
              {news.map((n, idx) => (
                <li key={n.url || idx} className="news-item">
                  <a href={n.url} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                  <div className="news-meta">
                    <small>{n.source?.title || 'Source'}</small>
                    <span style={{ marginLeft: 10 }}>
                      <button
                        onClick={() =>
                          sendFeedback('news', n.url || String(idx), 1)
                        }
                      >
                        👍
                      </button>
                      <button
                        onClick={() =>
                          sendFeedback('news', n.url || String(idx), -1)
                        }
                      >
                        👎
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>🤖 AI Insight of the Day</h2>
          <p>{insight}</p>
        </div>

        <div className="card">
          <h2>😄 Fun Crypto Meme</h2>
          {!meme ? (
            <p>Crypto Meme (fallback)</p>
          ) : (
            <>
              <p>{meme.title}</p>
              <img
                src={meme.url}
                alt="meme"
                style={{ width: '100%', borderRadius: 8 }}
              />
              <div style={{ marginTop: 8 }}>
                <button onClick={() => sendFeedback('meme', meme.url, 1)}>
                  👍
                </button>
                <button onClick={() => sendFeedback('meme', meme.url, -1)}>
                  👎
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={load}>
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default Dashboard;