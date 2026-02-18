import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [news, setNews] = useState([]);
  const [prices, setPrices] = useState([]);
  const [insight, setInsight] = useState('');
  const [meme, setMeme] = useState(null);

  const safeGet = async (path) => {
    try {
      const res = await api.get(path);
      return { ok: true, data: res.data };
    } catch (e) {
      // לא מפילים את כל הדשבורד בגלל endpoint אחד
      console.error(`Failed ${path}:`, e?.response?.status, e?.response?.data || e?.message);
      return { ok: false, error: e };
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      // במקום Promise.all שמפיל הכל, משתמשים ב-allSettled לטעינה חלקית
      const results = await Promise.allSettled([
        safeGet('/dashboard/news'),
        safeGet('/dashboard/prices'),
        safeGet('/dashboard/insight'),
        safeGet('/dashboard/meme')
      ]);

      // results[i] תמיד fulfilled כי safeGet לא זורק (מחזיר ok=false)
      const newsRes = results[0].value;
      const pricesRes = results[1].value;
      const insightRes = results[2].value;
      const memeRes = results[3].value;

      // NEWS
      if (newsRes.ok && Array.isArray(newsRes.data?.news)) {
        setNews(newsRes.data.news);
      } else {
        setNews([]);
      }

      // PRICES (זה ה"חיוני" ביותר אצלך)
      if (pricesRes.ok && Array.isArray(pricesRes.data?.prices)) {
        setPrices(pricesRes.data.prices);
      } else {
        setPrices([]);
        // אם prices נכשל – נציג הודעת שגיאה אחת ברורה
        setError('Prices failed to load (backend issue).');
      }

      // INSIGHT
      if (insightRes.ok && typeof insightRes.data?.insight === 'string') {
        setInsight(insightRes.data.insight);
      } else {
        setInsight('No insight available right now.');
      }

      // MEME (לא מפיל כלום)
      if (memeRes.ok && memeRes.data) {
        setMeme(memeRes.data);
      } else {
        setMeme(null);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const renderPrices = () => {
    if (!prices || prices.length === 0) return <p>No price data available.</p>;

    return (
      <ul className="prices-list">
        {prices.map((coin) => (
          <li key={coin.id || coin.symbol} className="price-item">
            <div className="price-left">
              <strong>{coin.name || coin.id || coin.symbol}</strong>
            </div>
            <div className="price-right">
              <span>${coin.price}</span>
              {typeof coin.change_24h === 'number' && (
                <span className={coin.change_24h >= 0 ? 'pos' : 'neg'}>
                  {' '}
                  ({coin.change_24h.toFixed(2)}%)
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderNews = () => {
    if (!news || news.length === 0) return <p>No news available at the moment.</p>;

    return (
      <ul className="news-list">
        {news.map((item, idx) => (
          <li key={item.url || idx} className="news-item">
            <a href={item.url || '#'} target="_blank" rel="noreferrer">
              {item.title || 'News item'}
            </a>
            <div className="news-meta">
              <small>{item.source?.title || item.source || 'Source'}</small>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderMeme = () => {
    if (!meme || !meme.url) return <p>No meme right now.</p>;

    return (
      <div className="meme-box">
        <div className="meme-title">{meme.title || 'Meme'}</div>
        <img src={meme.url} alt={meme.title || 'meme'} className="meme-img" />
        <div className="meme-meta">
          <small>{meme.source || ''}</small>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

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
          {renderPrices()}
        </div>

        <div className="card">
          <h2>📰 Market News</h2>
          {renderNews()}
        </div>

        <div className="card">
          <h2>🤖 AI Insight of the Day</h2>
          <p>{insight || 'Loading insight...'}</p>
        </div>

        <div className="card">
          <h2>😂 Fun Crypto Meme</h2>
          {renderMeme()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
