# Feedback System for Model Improvements

## Overview

This document describes how the feedback system works and how it can be used to train and improve recommendation models for the crypto dashboard.

## Current Implementation

### Database Schema

The `feedback` table stores user votes:
- `user_id`: Links feedback to specific user
- `content_type`: Type of content (news, price, insight, meme)
- `content_id`: Identifier for the specific content item
- `vote`: 1 for thumbs up, -1 for thumbs down
- `created_at`: Timestamp of feedback

### Data Collection

Every time a user votes on content:
1. Vote is stored in the database
2. Content type and ID are recorded
3. User preferences are linked via user_id

## Training Process for Model Improvements

### 1. Data Preparation

```sql
-- Extract feedback data with user preferences
SELECT 
    f.user_id,
    f.content_type,
    f.content_id,
    f.vote,
    f.created_at,
    up.interested_assets,
    up.investor_type,
    up.content_types
FROM feedback f
JOIN user_preferences up ON f.user_id = up.user_id
ORDER BY f.created_at DESC;
```

### 2. Feature Engineering

**User Features:**
- Investor type (HODLer, Day Trader, etc.)
- Interested assets (list of cryptocurrencies)
- Content type preferences

**Content Features:**
- Content type (news, price, insight, meme)
- Content metadata (source, coin, sentiment)
- Time-based features (day of week, time of day)

**Interaction Features:**
- User-content similarity scores
- Historical vote patterns
- Content popularity metrics

### 3. Model Training Approaches

#### A. Collaborative Filtering
- **User-based**: Find users with similar preferences and recommend what they liked
- **Item-based**: Find similar content items and recommend based on user's past votes
- **Matrix Factorization**: Use techniques like SVD or NMF to learn latent factors

#### B. Content-Based Filtering
- Train models to predict user preferences based on content features
- Use user preferences from onboarding to create initial profile
- Update profile based on feedback

#### C. Hybrid Approach
- Combine collaborative filtering with content-based filtering
- Use ensemble methods to improve accuracy
- Weight recommendations based on user's investor type

### 4. Training Pipeline

```python
# Pseudocode for training pipeline

1. Load feedback data from database
2. Load user preferences
3. Feature engineering:
   - Encode categorical variables
   - Create user-content interaction matrix
   - Extract content features from APIs
4. Split data: 80% training, 20% validation
5. Train model:
   - Option A: Collaborative Filtering (Surprise library)
   - Option B: Neural Collaborative Filtering (TensorFlow/PyTorch)
   - Option C: Gradient Boosting (XGBoost/LightGBM)
6. Evaluate on validation set:
   - Precision@K
   - Recall@K
   - NDCG (Normalized Discounted Cumulative Gain)
7. Deploy model to production
8. A/B test new recommendations vs. current system
```

### 5. Model Types

#### Simple Recommendation Model
- **Logistic Regression**: Predict probability of positive vote
- **Features**: User preferences + content features
- **Output**: Score for each content item

#### Advanced Models
- **Neural Collaborative Filtering**: Deep learning for recommendations
- **Transformer Models**: Use BERT-like models for content understanding
- **Reinforcement Learning**: Learn optimal recommendation strategy over time

### 6. Continuous Learning

**Online Learning Approach:**
1. Collect feedback in real-time
2. Update model periodically (daily/weekly)
3. Use incremental learning to avoid retraining from scratch
4. Monitor model performance metrics

**Feedback Loop:**
```
User votes → Store in DB → Feature extraction → 
Model update → New recommendations → User sees content → 
More votes → Repeat
```

### 7. Evaluation Metrics

**Accuracy Metrics:**
- Precision: % of recommended items user actually liked
- Recall: % of liked items that were recommended
- F1-Score: Harmonic mean of precision and recall

**Ranking Metrics:**
- NDCG: Measures quality of ranking
- MAP (Mean Average Precision): Average precision across users

**Business Metrics:**
- Engagement rate: % of users who vote
- Positive feedback rate: % of thumbs up votes
- User retention: Do users return to dashboard?

### 8. Implementation Steps

1. **Phase 1: Data Collection** (Current)
   - Collect feedback from users
   - Build sufficient dataset (aim for 1000+ votes)

2. **Phase 2: Baseline Model**
   - Implement simple content-based filtering
   - Use user preferences from onboarding
   - A/B test against random recommendations

3. **Phase 3: Collaborative Filtering**
   - Implement user-based or item-based CF
   - Requires sufficient user base (100+ users)

4. **Phase 4: Advanced Models**
   - Neural collaborative filtering
   - Deep learning for content understanding
   - Real-time personalization

5. **Phase 5: Production**
   - Deploy model as microservice
   - Integrate with dashboard API
   - Monitor and iterate

### 9. Example Implementation (Python)

```python
import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split

# Load feedback data
feedback_df = pd.read_sql("""
    SELECT user_id, content_id, vote 
    FROM feedback 
    WHERE vote = 1
""", db_connection)

# Prepare data for Surprise library
reader = Reader(rating_scale=(0, 1))
data = Dataset.load_from_df(feedback_df[['user_id', 'content_id', 'vote']], reader)

# Split data
trainset, testset = train_test_split(data, test_size=0.2)

# Train SVD model
algo = SVD()
algo.fit(trainset)

# Make predictions
predictions = algo.test(testset)

# Get recommendations for user
user_id = 1
all_items = set(feedback_df['content_id'].unique())
user_items = set(feedback_df[feedback_df['user_id'] == user_id]['content_id'])
items_to_predict = all_items - user_items

recommendations = []
for item_id in items_to_predict:
    pred = algo.predict(user_id, item_id)
    recommendations.append((item_id, pred.est))

# Sort by predicted rating
recommendations.sort(key=lambda x: x[1], reverse=True)
top_recommendations = recommendations[:10]
```

### 10. Database Schema for Training

Consider adding these tables for advanced features:

```sql
-- Content metadata cache
CREATE TABLE content_metadata (
    content_id TEXT PRIMARY KEY,
    content_type TEXT,
    title TEXT,
    source TEXT,
    tags TEXT,
    created_at DATETIME
);

-- Model predictions cache
CREATE TABLE recommendations (
    user_id INTEGER,
    content_id TEXT,
    score REAL,
    model_version TEXT,
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- A/B test results
CREATE TABLE ab_test_results (
    user_id INTEGER,
    variant TEXT,
    engagement_rate REAL,
    created_at DATETIME
);
```

## Benefits of This Approach

1. **Personalization**: Each user gets content tailored to their preferences
2. **Continuous Improvement**: Model learns from every vote
3. **Scalability**: Can handle thousands of users and content items
4. **Transparency**: Can explain why content was recommended
5. **Adaptability**: Model adapts to changing user preferences

## Next Steps

1. Collect more feedback data (aim for 1000+ votes)
2. Implement baseline recommendation model
3. Set up model training pipeline
4. Deploy model as separate service
5. Integrate with dashboard API
6. Monitor and iterate based on user engagement
