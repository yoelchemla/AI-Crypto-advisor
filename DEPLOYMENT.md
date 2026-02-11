# Deployment Guide

## Backend Deployment (Render/Railway)

1. **Create account** on Render or Railway
2. **Connect your GitHub repository**
3. **Set environment variables**:
   - `PORT` (auto-set by platform)
   - `JWT_SECRET` (generate a strong random string)
   - `OPENROUTER_API_KEY` (optional, for AI insights)
   - `CRYPTOPANIC_API_KEY` (optional, for news)
4. **Build command**: `cd backend && npm install`
5. **Start command**: `cd backend && npm start`
6. **Note**: SQLite database file will be created automatically

## Frontend Deployment (Vercel/Netlify)

### Vercel:
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Navigate to frontend**: `cd frontend`
3. **Deploy**: `vercel`
4. **Set environment variable**: `REACT_APP_API_URL` = your backend URL + `/api`

### Netlify:
1. **Connect GitHub repository**
2. **Build settings**:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
3. **Environment variables**: `REACT_APP_API_URL` = your backend URL + `/api`

## Database Access

The SQLite database file (`crypto_dashboard.db`) is stored in the backend directory.
To access it:
- **Local**: Use SQLite browser or command line
- **Production**: Download from deployment platform or use their database tools

## API Keys Setup

### OpenRouter (for AI Insights)
1. Sign up at https://openrouter.ai
2. Get free API key
3. Add to backend `.env` as `OPENROUTER_API_KEY`

### CryptoPanic (for News)
1. Sign up at https://cryptopanic.com/developers/api/
2. Get free API key
3. Add to backend `.env` as `CRYPTOPANIC_API_KEY`

Note: Both APIs work without keys but with limited features.
