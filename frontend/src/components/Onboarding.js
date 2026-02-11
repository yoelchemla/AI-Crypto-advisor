import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Onboarding.css';

const Onboarding = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    interested_assets: [],
    investor_type: '',
    content_types: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cryptoAssets = [
    'bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot',
    'chainlink', 'avalanche', 'polygon', 'litecoin', 'dogecoin'
  ];

  const investorTypes = [
    { value: 'HODLer', label: 'HODLer - Long-term holder' },
    { value: 'Day Trader', label: 'Day Trader - Active trading' },
    { value: 'NFT Collector', label: 'NFT Collector' },
    { value: 'DeFi Enthusiast', label: 'DeFi Enthusiast' },
    { value: 'General Investor', label: 'General Investor' }
  ];

  const contentTypes = [
    { value: 'Market News', label: 'Market News' },
    { value: 'Charts', label: 'Charts & Analysis' },
    { value: 'Social', label: 'Social Media Trends' },
    { value: 'Fun', label: 'Fun Content & Memes' }
  ];

  const handleAssetToggle = (asset) => {
    setFormData(prev => {
      const assets = prev.interested_assets.includes(asset)
        ? prev.interested_assets.filter(a => a !== asset)
        : [...prev.interested_assets, asset];
      return { ...prev, interested_assets: assets };
    });
  };

  const handleInvestorTypeSelect = (type) => {
    setFormData(prev => ({ ...prev, investor_type: type }));
  };

  const handleContentTypeToggle = (type) => {
    setFormData(prev => {
      const types = prev.content_types.includes(type)
        ? prev.content_types.filter(t => t !== type)
        : [...prev.content_types, type];
      return { ...prev, content_types: types };
    });
  };

  const handleNext = () => {
    if (step === 1 && formData.interested_assets.length === 0) {
      setError('Please select at least one crypto asset');
      return;
    }
    if (step === 2 && !formData.investor_type) {
      setError('Please select your investor type');
      return;
    }
    if (step === 3 && formData.content_types.length === 0) {
      setError('Please select at least one content type');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (formData.content_types.length === 0) {
      setError('Please select at least one content type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/dashboard/preferences', formData);
      onComplete();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <h1>Let's Get Started!</h1>
        <p className="subtitle">Help us personalize your dashboard</p>

        {step === 1 && (
          <div className="onboarding-step">
            <h2>What crypto assets are you interested in?</h2>
            <p className="step-description">Select all that apply</p>
            <div className="asset-grid">
              {cryptoAssets.map(asset => (
                <button
                  key={asset}
                  className={`asset-chip ${formData.interested_assets.includes(asset) ? 'selected' : ''}`}
                  onClick={() => handleAssetToggle(asset)}
                >
                  {asset.charAt(0).toUpperCase() + asset.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={handleNext}>
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>What type of investor are you?</h2>
            <p className="step-description">Choose the option that best describes you</p>
            <div className="investor-types">
              {investorTypes.map(type => (
                <button
                  key={type.value}
                  className={`investor-type-card ${formData.investor_type === type.value ? 'selected' : ''}`}
                  onClick={() => handleInvestorTypeSelect(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="step-buttons">
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h2>What kind of content would you like to see?</h2>
            <p className="step-description">Select all that interest you</p>
            <div className="content-types">
              {contentTypes.map(type => (
                <button
                  key={type.value}
                  className={`content-type-card ${formData.content_types.includes(type.value) ? 'selected' : ''}`}
                  onClick={() => handleContentTypeToggle(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {error && <div className="error">{error}</div>}
            <div className="step-buttons">
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
