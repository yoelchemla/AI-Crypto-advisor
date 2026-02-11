# Crypto Investor Dashboard

A personalized crypto investor dashboard that learns from user preferences and provides daily AI-curated content.

## Features

- User authentication (JWT-based)
- Onboarding quiz to understand user preferences
- Daily dashboard with:
  - Market News (CryptoPanic API)
  - Coin Prices (CoinGecko API)
  - AI Insight of the Day
  - Fun Crypto Memes
- Feedback system (thumbs up/down) for content recommendations

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: SQLite
- **APIs**: CoinGecko, CryptoPanic, OpenRouter

## Setup

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

```bash
# Backend
cd backend
npm install
npm start

# Frontend (new terminal)
cd frontend
npm install
npm start
```

## Documentation

- [QUICK_START.md](./QUICK_START.md) - Setup and running instructions
- [EXPLANATION_HE.md](./EXPLANATION_HE.md) - Detailed explanation in Hebrew
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [FEEDBACK_SYSTEM.md](./FEEDBACK_SYSTEM.md) - Feedback system and ML training process
- [AI_TOOLS_USAGE.md](./AI_TOOLS_USAGE.md) - AI tools usage summary

## Deployment

- Frontend: Vercel/Netlify
- Backend: Render/Railway

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
