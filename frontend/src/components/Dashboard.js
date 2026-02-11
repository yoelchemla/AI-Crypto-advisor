import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [prices, setPrices] = useState([]);
  const [insight, setInsight] = useState('');
  const [meme, setMeme] = useState(null);
  const [votedItems, setVotedItems] = useState(new Set());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all dashboard sections in parallel
      const [newsRes, pricesRes, insightRes, memeRes] = await Promise.all([
        api.get('/dashboard/news'),
        api.get('/dashboard/prices'),
        api.get('/dashboard/insight'),
        api.get('/dashboard/meme')
      ]);

      setNews(newsRes.data.news || []);
      setPrices(pricesRes.data.prices || []);
      setInsight(insightRes.data.insight || '');
      setMeme(memeRes.data || null);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (contentType, contentId, vote) => {
    const voteKey = `${contentType}-${contentId}`;
    if (votedItems.has(voteKey)) {
      return; // Already voted
    }

    try {
      await api.post('/dashboard/feedback', {
        content_type: contentType,
        content_id: contentId,
        vote: vote
      });
      setVotedItems(prev => new Set([...prev, voteKey]));
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Your Crypto Dashboard</h1>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-grid">
        {/* Market News Section */}
        <div className="dashboard-card">
          <h2>📰 Market News</h2>
          <div className="news-list">
            {news.length > 0 ? (
              news.map((item, index) => {
                const voteKey = `news-${index}`;
                const hasVoted = votedItems.has(voteKey);
                return (
                  <div key={index} className="news-item">
                    <h3>{item.title}</h3>
                    <p className="news-source">{item.source?.title || 'Crypto News'}</p>
                    {item.url && item.url !== '#' && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-link">
                        Read more →
                      </a>
                    )}
                    <div className="vote-buttons">
                      <button
                        className={`vote-btn up ${hasVoted ? 'disabled' : ''}`}
                        onClick={() => handleVote('news', index, 1)}
                        disabled={hasVoted}
                      >
                        👍
                      </button>
                      <button
                        className={`vote-btn down ${hasVoted ? 'disabled' : ''}`}
                        onClick={() => handleVote('news', index, -1)}
                        disabled={hasVoted}
                      >
                        👎
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No news available at the moment.</p>
            )}
          </div>
        </div>

        {/* Coin Prices Section */}
        <div className="dashboard-card">
          <h2>💰 Coin Prices</h2>
          <div className="prices-list">
            {prices.length > 0 ? (
              prices.map((coin, index) => {
                const voteKey = `price-${coin.id}`;
                const hasVoted = votedItems.has(voteKey);
                const changeColor = coin.change_24h >= 0 ? '#28a745' : '#dc3545';
                return (
                  <div key={coin.id} className="price-item">
                    <div className="price-header">
                      <h3>{coin.name}</h3>
                      <span className="price-value">${coin.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="price-change" style={{ color: changeColor }}>
                      {coin.change_24h >= 0 ? '↑' : '↓'} {Math.abs(coin.change_24h?.toFixed(2) || 0)}%
                    </div>
                    <div className="vote-buttons">
                      <button
                        className={`vote-btn up ${hasVoted ? 'disabled' : ''}`}
                        onClick={() => handleVote('price', coin.id, 1)}
                        disabled={hasVoted}
                      >
                        👍
                      </button>
                      <button
                        className={`vote-btn down ${hasVoted ? 'disabled' : ''}`}
                        onClick={() => handleVote('price', coin.id, -1)}
                        disabled={hasVoted}
                      >
                        👎
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No price data available.</p>
            )}
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="dashboard-card">
          <h2>🤖 AI Insight of the Day</h2>
          <div className="insight-content">
            <p>{insight || 'Loading insight...'}</p>
            {insight && (
              <div className="vote-buttons">
                <button
                  className={`vote-btn up ${votedItems.has('insight-daily') ? 'disabled' : ''}`}
                  onClick={() => handleVote('insight', 'daily', 1)}
                  disabled={votedItems.has('insight-daily')}
                >
                  👍
                </button>
                <button
                  className={`vote-btn down ${votedItems.has('insight-daily') ? 'disabled' : ''}`}
                  onClick={() => handleVote('insight', 'daily', -1)}
                  disabled={votedItems.has('insight-daily')}
                >
                  👎
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meme Section */}
        <div className="dashboard-card">
          <h2>😄 Fun Crypto Meme</h2>
          {meme ? (
            <div className="meme-content">
              <img src={meme.url} alt={meme.title} className="meme-image" />
              <p className="meme-title">{meme.title}</p>
              <div className="vote-buttons">
                <button
                  className={`vote-btn up ${votedItems.has('meme-daily') ? 'disabled' : ''}`}
                  onClick={() => handleVote('meme', 'daily', 1)}
                  disabled={votedItems.has('meme-daily')}
                >
                  👍
                </button>
                <button
                  className={`vote-btn down ${votedItems.has('meme-daily') ? 'disabled' : ''}`}
                  onClick={() => handleVote('meme', 'daily', -1)}
                  disabled={votedItems.has('meme-daily')}
                >
                  👎
                </button>
              </div>
            </div>
          ) : (
            <p>No meme available at the moment.</p>
          )}
        </div>
      </div>

      <button className="btn btn-primary refresh-btn" onClick={loadDashboardData}>
        🔄 Refresh Dashboard
      </button>
    </div>
  );
};

export default Dashboard;
