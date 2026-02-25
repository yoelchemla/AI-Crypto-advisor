import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [prices, setPrices] = useState([]);
  const [news, setNews] = useState([]);
  const [insight, setInsight] = useState('');
  const [meme, setMeme] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [notes, setNotes] = useState({
    prices: '',
    news: ''
  });

  const sendFeedback = async (contentType, contentId, vote) => {
    try {
      await api.post('/dashboard/feedback', {
        content_type: contentType,
        content_id: String(contentId),
        vote
      });
      // אופציונלי: אפשר להוסיף toast בעתיד
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const load = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const params = forceRefresh ? { refresh: 1 } : undefined;

      const [newsRes, pricesRes, insightRes, memeRes] = await Promise.all([
        api.get('/dashboard/news', { params }),
        api.get('/dashboard/prices', { params }),
        api.get('/dashboard/insight', { params }),
        api.get('/dashboard/meme', { params })
      ]);

      setNews(Array.isArray(newsRes.data?.news) ? newsRes.data.news : []);
      setPrices(Array.isArray(pricesRes.data?.prices) ? pricesRes.data.prices : []);
      setInsight(insightRes.data?.insight || '');
      setMeme(memeRes.data || null);

      setNotes({
        prices: pricesRes.data?.note || '',
        news: newsRes.data?.note || ''
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleRefresh = () => {
    load(true);
  };

  const formatPrice = (value) => {
    const num = Number(value || 0);
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    };

  const formatChange = (value) => {
    const num = Number(value || 0);
    const sign = num >= 0 ? '↑' : '↓';
    return `${sign} ${Math.abs(num).toFixed(2)}%`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Crypto Dashboard</h1>
        </div>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Crypto Dashboard</h1>

        <div className="dashboard-actions">
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            type="button"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button className="btn btn-danger" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* AI Insight */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2>🤖 AI Insight of the Day</h2>
          <div className="feedback-buttons">
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('insight', 'daily_insight', 1)}
              title="Helpful"
            >
              👍
            </button>
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('insight', 'daily_insight', -1)}
              title="Not helpful"
            >
              👎
            </button>
          </div>
        </div>

        <div className="insight-card">
          <p>{insight || 'Loading insight...'}</p>
        </div>
      </section>

      {/* Prices */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2>💰 Coin Prices</h2>
          <div className="feedback-buttons">
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('prices', 'prices_section', 1)}
              title="Helpful"
            >
              👍
            </button>
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('prices', 'prices_section', -1)}
              title="Not helpful"
            >
              👎
            </button>
          </div>
        </div>

        {notes.prices && <div className="info-note">{notes.prices}</div>}

        {!prices || prices.length === 0 ? (
          <p>No price data available.</p>
        ) : (
          <div className="prices-grid">
            {prices.map((coin) => (
              <div key={coin.id} className="price-card">
                <h3>{coin.name}</h3>
                <p className="price-value">{formatPrice(coin.price)}</p>
                <p className={`price-change ${Number(coin.change_24h) >= 0 ? 'positive' : 'negative'}`}>
                  {formatChange(coin.change_24h)}
                </p>

                <div className="inline-feedback">
                  <button
                    type="button"
                    className="feedback-btn small"
                    onClick={() => sendFeedback('price_coin', coin.id, 1)}
                    title={`Like ${coin.name}`}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className="feedback-btn small"
                    onClick={() => sendFeedback('price_coin', coin.id, -1)}
                    title={`Dislike ${coin.name}`}
                  >
                    👎
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* News */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2>📰 Market News</h2>
          <div className="feedback-buttons">
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('news', 'news_section', 1)}
              title="Helpful"
            >
              👍
            </button>
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('news', 'news_section', -1)}
              title="Not helpful"
            >
              👎
            </button>
          </div>
        </div>

        {notes.news && <div className="info-note">{notes.news}</div>}

        {!news || news.length === 0 ? (
          <p>No news available at the moment.</p>
        ) : (
          <div className="news-list">
            {news.map((item, index) => (
              <div key={item.id || `${item.title}-${index}`} className="news-item">
                <div className="news-content">
                  <a
                    href={item.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="news-title"
                  >
                    {item.title || 'Crypto market update'}
                  </a>

                  <div className="news-meta">
                    <span>{item.source?.title || 'Unknown source'}</span>
                    {item.published_at ? <span> • {formatDate(item.published_at)}</span> : null}
                  </div>
                </div>

                <div className="inline-feedback">
                  <button
                    type="button"
                    className="feedback-btn small"
                    onClick={() =>
                      sendFeedback('news_item', item.id || item.url || `news-${index}`, 1)
                    }
                    title="Like article"
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className="feedback-btn small"
                    onClick={() =>
                      sendFeedback('news_item', item.id || item.url || `news-${index}`, -1)
                    }
                    title="Dislike article"
                  >
                    👎
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Meme */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2>😄 Fun Crypto Meme</h2>
          <div className="feedback-buttons">
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('meme', meme?.url || meme?.title || 'meme', 1)}
              title="Funny"
            >
              👍
            </button>
            <button
              type="button"
              className="feedback-btn"
              onClick={() => sendFeedback('meme', meme?.url || meme?.title || 'meme', -1)}
              title="Not funny"
            >
              👎
            </button>
          </div>
        </div>

        {!meme ? (
          <p>No meme available.</p>
        ) : (
          <div className="meme-card">
            <h3>{meme.title || 'Crypto Meme'}</h3>
            {meme.url ? (
              <img
                src={meme.url}
                alt={meme.title || 'Crypto Meme'}
                className="meme-image"
                loading="lazy"
              />
            ) : (
              <p>No meme image available.</p>
            )}
            <p className="meme-source">{meme.source || 'Unknown source'}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;