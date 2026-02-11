# הסבר מקיף על הפרויקט - Crypto Investor Dashboard

## 📋 תוכן עניינים
1. [מבנה הפרויקט - תיקיה אחר תיקיה](#מבנה-הפרויקט)
2. [Database - מסד הנתונים](#database)
3. [Backend - השרת](#backend)
4. [Frontend - הלקוח](#frontend)
5. [JWT - מערכת האימות](#jwt)
6. [APIs - ממשקי API](#apis)
7. [התאמה אישית - איך זה עובד](#התאמה-אישית)
8. [Daily Dashboard - איך זה מתעדכן](#daily-dashboard)
9. [Feedback System - מערכת המשוב](#feedback-system)
10. [AI Service - איך AI עובד](#ai-service)
11. [Deployment - פריסה](#deployment)
12. [ארכיטקטורה כללית](#ארכיטקטורה)

---

## 📁 מבנה הפרויקט

### מבנה כללי:
```
moveo_task/
├── backend/          # השרת (Node.js + Express)
├── frontend/         # הלקוח (React)
└── [קבצי תיעוד]     # README, DEPLOYMENT וכו'
```

---

## 🗄️ Database

### איזה מסד נתונים השתמשתי?
**SQLite** - מסד נתונים קובץ (file-based database)

### למה SQLite?
- ✅ **קל להתקנה** - לא צריך שרת נפרד
- ✅ **מושלם לפרויקטים קטנים-בינוניים**
- ✅ **עובד מצוין עם Node.js**
- ✅ **קובץ אחד** - כל הנתונים בקובץ `crypto_dashboard.db`

### מה יש במסד הנתונים?

#### 1. טבלת `users` (משתמשים)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,  -- מוצפן עם bcrypt
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**מה זה עושה?**
- שומר את כל המשתמשים שנרשמו
- כל משתמש יש לו: ID, אימייל (ייחודי), שם, סיסמה מוצפנת, תאריך הרשמה

#### 2. טבלת `user_preferences` (העדפות משתמש)
```sql
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  interested_assets TEXT NOT NULL,      -- JSON: ["bitcoin", "ethereum"]
  investor_type TEXT NOT NULL,         -- "HODLer", "Day Trader" וכו'
  content_types TEXT NOT NULL,         -- JSON: ["Market News", "Charts"]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**מה זה עושה?**
- שומר את התשובות משאלון האונבורדינג
- כל משתמש יש לו העדפות משלו
- `interested_assets` ו-`content_types` נשמרים כ-JSON (מערך של מחרוזות)

#### 3. טבלת `feedback` (משוב)
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,          -- "news", "price", "insight", "meme"
  content_id TEXT NOT NULL,            -- מזהה הפריט
  vote INTEGER NOT NULL,                -- 1 (thumbs up) או -1 (thumbs down)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**מה זה עושה?**
- שומר כל הצבעה (thumbs up/down) של המשתמש
- מאפשר לנו לדעת מה המשתמש אוהב/לא אוהב
- בעתיד: נוכל להשתמש בזה לאימון מודל ML

### איך המסד נתונים נוצר?
בקובץ `backend/database.js`:
- כשהשרת מתחיל, הוא בודק אם הטבלאות קיימות
- אם לא - הוא יוצר אותן אוטומטית
- הקובץ `crypto_dashboard.db` נוצר אוטומטית בתיקיית `backend/`

---

## 🖥️ Backend

### מה זה Backend?
השרת שמטפל בכל הלוגיקה, מסד הנתונים, והתקשורת עם APIs חיצוניים.

### שפות וטכנולוגיות:
- **JavaScript (Node.js)** - שפת התכנות
- **Express.js** - Framework לבניית שרתים
- **SQLite3** - חיבור למסד הנתונים
- **bcryptjs** - הצפנת סיסמאות
- **jsonwebtoken** - יצירת JWT tokens
- **axios** - בקשות HTTP ל-APIs חיצוניים
- **dotenv** - ניהול משתני סביבה (.env)

### מבנה התיקיות:

#### `backend/server.js` - נקודת הכניסה
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());           // מאפשר בקשות מהדפדפן
app.use(express.json());   // מפענח JSON מהבקשות

// Routes
app.use('/api/auth', authRoutes);        // נתיבי אימות
app.use('/api/dashboard', dashboardRoutes); // נתיבי דאשבורד

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**מה קורה כאן?**
1. יוצר שרת Express
2. מגדיר middleware (CORS, JSON parser)
3. מחבר את הנתיבים (routes)
4. מפעיל את השרת על פורט 5001

#### `backend/routes/auth.js` - נתיבי אימות
**2 endpoints:**

1. **POST `/api/auth/register`** - הרשמה
   - מקבל: email, name, password
   - בודק אם המשתמש כבר קיים
   - מצפין את הסיסמה עם bcrypt
   - שומר במסד הנתונים
   - מחזיר JWT token

2. **POST `/api/auth/login`** - התחברות
   - מקבל: email, password
   - בודק אם המשתמש קיים
   - משווה סיסמה מוצפנת
   - מחזיר JWT token

#### `backend/routes/dashboard.js` - נתיבי דאשבורד
**6 endpoints:**

1. **GET `/api/dashboard/preferences`** - קבלת העדפות
2. **POST `/api/dashboard/preferences`** - שמירת העדפות
3. **GET `/api/dashboard/news`** - חדשות שוק
4. **GET `/api/dashboard/prices`** - מחירי מטבעות
5. **GET `/api/dashboard/insight`** - תובנת AI
6. **GET `/api/dashboard/meme`** - מם קריפטו
7. **POST `/api/dashboard/feedback`** - שליחת משוב

#### `backend/middleware/auth.js` - Middleware לאימות
```javascript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'].split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;  // מוסיף את המשתמש לבקשה
    next();           // ממשיך לנתיב הבא
  });
};
```

**מה זה עושה?**
- בודק את ה-JWT token בכל בקשה מוגנת
- אם תקין - מוסיף את פרטי המשתמש ל-`req.user`
- אם לא תקין - מחזיר שגיאה 403

---

## 💻 Frontend

### מה זה Frontend?
הממשק שהמשתמש רואה בדפדפן - כל מה שקשור ל-UI/UX.

### שפות וטכנולוגיות:
- **JavaScript (React)** - ספריית UI
- **React Router** - ניהול דפים (routing)
- **Axios** - בקשות HTTP לשרת
- **CSS** - עיצוב

### מבנה התיקיות:

#### `frontend/src/index.js` - נקודת הכניסה
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

**מה קורה כאן?**
- טוען את האפליקציה React
- מחבר אותה ל-HTML (`<div id="root">`)

#### `frontend/src/App.js` - האפליקציה הראשית
**מה זה עושה?**
- מגדיר את כל הנתיבים (routes)
- מטפל במצב האימות (isAuthenticated)
- מטפל במצב האונבורדינג (hasCompletedOnboarding)
- ניהול navigation בין דפים

**הנתיבים:**
- `/login` → דף התחברות
- `/signup` → דף הרשמה
- `/onboarding` → שאלון אונבורדינג
- `/dashboard` → דאשבורד ראשי

#### `frontend/src/components/` - רכיבי React

1. **Login.js** - דף התחברות
   - טופס: email, password
   - שולח בקשה ל-`/api/auth/login`
   - שומר את ה-token ב-localStorage

2. **Signup.js** - דף הרשמה
   - טופס: name, email, password
   - שולח בקשה ל-`/api/auth/register`
   - שומר את ה-token ב-localStorage

3. **Onboarding.js** - שאלון אונבורדינג
   - 3 שלבים:
     - שלב 1: בחירת מטבעות מעניינים
     - שלב 2: בחירת סוג משקיע
     - שלב 3: בחירת סוגי תוכן
   - שולח את התשובות ל-`/api/dashboard/preferences`

4. **Dashboard.js** - דאשבורד ראשי
   - טוען 4 חלקים:
     - Market News
     - Coin Prices
     - AI Insight
     - Meme
   - כל חלק כולל כפתורי thumbs up/down

#### `frontend/src/utils/api.js` - כלי עזר ל-API
```javascript
const api = axios.create({
  baseURL: 'http://localhost:5001/api'
});

// מוסיף token אוטומטית לכל בקשה
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**מה זה עושה?**
- יוצר instance של axios עם URL בסיסי
- מוסיף את ה-JWT token אוטומטית לכל בקשה
- מטפל בשגיאות

---

## 🔐 JWT (JSON Web Token)

### מה זה JWT?
טוקן דיגיטלי שמזהה את המשתמש - כמו כרטיס כניסה.

### איך זה עובד?

#### 1. יצירת Token (בהרשמה/התחברות)
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email, name: user.name },
  JWT_SECRET,
  { expiresIn: '7d' }  // תקף ל-7 ימים
);
```

**מה יש ב-token?**
- Payload: id, email, name של המשתמש
- חתום עם secret key (JWT_SECRET)
- תקף ל-7 ימים

#### 2. שליחת Token
- השרת מחזיר את ה-token למשתמש
- Frontend שומר את ה-token ב-localStorage
- בכל בקשה מוגנת, ה-token נשלח ב-header:
  ```
  Authorization: Bearer <token>
  ```

#### 3. אימות Token (בכל בקשה מוגנת)
```javascript
jwt.verify(token, JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ error: 'Invalid token' });
  req.user = user;  // מוסיף את המשתמש לבקשה
});
```

### למה JWT?
- ✅ **Stateless** - השרת לא צריך לשמור sessions
- ✅ **בטוח** - חתום עם secret key
- ✅ **קל לשימוש** - רק צריך לבדוק את ה-token

---

## 🌐 APIs

### מה זה API?
ממשק שמאפשר תקשורת בין שירותים שונים.

### APIs חיצוניים שהשתמשתי:

#### 1. CoinGecko API - מחירי מטבעות
```javascript
const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
  params: {
    ids: 'bitcoin,ethereum,cardano',
    vs_currencies: 'usd',
    include_24hr_change: true
  }
});
```

**מה זה מחזיר?**
```json
{
  "bitcoin": {
    "usd": 45000,
    "usd_24h_change": 2.5
  },
  "ethereum": {
    "usd": 3000,
    "usd_24h_change": -1.2
  }
}
```

**איך זה עובד?**
- בקשה HTTP GET ל-API של CoinGecko
- מחזיר JSON עם מחירים
- השרת מטפל בנתונים ומחזיר למשתמש

#### 2. CryptoPanic API - חדשות שוק
```javascript
const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
  params: {
    public: true,
    filter: 'hot',
    currencies: 'BTC,ETH'
  }
});
```

**מה זה מחזיר?**
```json
{
  "results": [
    {
      "title": "Bitcoin reaches new highs",
      "url": "https://...",
      "published_at": "2024-01-01T12:00:00Z",
      "source": { "title": "Crypto News" }
    }
  ]
}
```

#### 3. Reddit API - ממים
```javascript
const response = await axios.get('https://www.reddit.com/r/cryptomemes/hot.json', {
  params: { limit: 10 }
});
```

**מה זה מחזיר?**
- רשימת פוסטים מ-Reddit
- מסנן רק תמונות
- בוחר מם אקראי

#### 4. OpenRouter API - AI Insights
```javascript
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'meta-llama/llama-3.2-3b-instruct:free',
  messages: [
    { role: 'system', content: 'You are a crypto analyst...' },
    { role: 'user', content: 'Provide insight for HODLer...' }
  ]
});
```

**מה זה מחזיר?**
```json
{
  "choices": [{
    "message": {
      "content": "For HODLers: The market shows resilience..."
    }
  }]
}
```

### איך JSON עובד?
**JSON (JavaScript Object Notation)** - פורמט להעברת נתונים.

**דוגמה:**
```json
{
  "name": "John",
  "age": 30,
  "coins": ["bitcoin", "ethereum"]
}
```

**בקוד JavaScript:**
```javascript
const data = JSON.parse(jsonString);  // ממיר JSON למשתנה
const json = JSON.stringify(data);    // ממיר משתנה ל-JSON
```

---

## 🎯 התאמה אישית

### איך המערכת יודעת מה להציג למשתמש?

#### שלב 1: אונבורדינג
כשמשתמש חדש נרשם, הוא עונה על שאלון:
1. **אילו מטבעות מעניינים?** → נשמר ב-`interested_assets`
2. **איזה סוג משקיע?** → נשמר ב-`investor_type`
3. **איזה סוגי תוכן?** → נשמר ב-`content_types`

#### שלב 2: שמירה במסד הנתונים
```javascript
db.run(
  'INSERT INTO user_preferences (user_id, interested_assets, investor_type, content_types) VALUES (?, ?, ?, ?)',
  [user_id, JSON.stringify(assets), investor_type, JSON.stringify(types)]
);
```

#### שלב 3: טעינת העדפות
כשמשתמש נכנס לדאשבורד:
```javascript
// 1. טוען את העדפות המשתמש
const preferences = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [user_id]);

// 2. משתמש בהעדפות לטעינת תוכן
const coins = JSON.parse(preferences.interested_assets);  // ["bitcoin", "ethereum"]
const investorType = preferences.investor_type;            // "HODLer"
```

#### שלב 4: התאמת תוכן
```javascript
// מחירי מטבעות - רק המטבעות שהמשתמש בחר
const coins = preferences.interested_assets;  // ["bitcoin", "ethereum"]
const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
  params: { ids: coins.join(',') }
});

// AI Insight - מותאם לסוג המשקיע
const prompt = `Provide insight for a ${preferences.investor_type}...`;
```

### דוגמה:
**משתמש A:**
- מטבעות: bitcoin, ethereum
- סוג משקיע: HODLer
- תוכן: Market News, Charts

**משתמש B:**
- מטבעות: solana, cardano
- סוג משקיע: Day Trader
- תוכן: Social, Fun

**כל משתמש יראה תוכן שונה!**

---

## 📊 Daily Dashboard

### איך הדאשבורד מתעדכן?

#### 1. טעינה ראשונית
כשמשתמש נכנס לדאשבורד (`Dashboard.js`):
```javascript
useEffect(() => {
  loadDashboardData();
}, []);

const loadDashboardData = async () => {
  const [newsRes, pricesRes, insightRes, memeRes] = await Promise.all([
    api.get('/dashboard/news'),
    api.get('/dashboard/prices'),
    api.get('/dashboard/insight'),
    api.get('/dashboard/meme')
  ]);
  
  setNews(newsRes.data.news);
  setPrices(pricesRes.data.prices);
  setInsight(insightRes.data.insight);
  setMeme(memeRes.data);
};
```

**מה קורה כאן?**
- `Promise.all` - טוען את כל הנתונים במקביל (מהר יותר)
- כל endpoint מחזיר JSON
- הנתונים נשמרים ב-state של React

#### 2. עדכון ידני
כפתור "Refresh Dashboard":
```javascript
<button onClick={loadDashboardData}>🔄 Refresh Dashboard</button>
```

#### 3. מה קורה בכל endpoint?

**GET `/api/dashboard/news`:**
```javascript
// 1. טוען העדפות משתמש
const preferences = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [user_id]);

// 2. שולח בקשה ל-CryptoPanic API
const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
  params: { currencies: 'BTC,ETH' }
});

// 3. מחזיר JSON
res.json({ news: response.data.results });
```

**GET `/api/dashboard/prices`:**
```javascript
// 1. טוען העדפות - אילו מטבעות המשתמש רוצה לראות
const coins = JSON.parse(preferences.interested_assets);

// 2. שולח בקשה ל-CoinGecko API
const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
  params: { ids: coins.join(',') }
});

// 3. מעבר על התוצאות ויצירת מערך
const prices = Object.entries(response.data).map(([id, data]) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  price: data.usd,
  change_24h: data.usd_24h_change
}));

// 4. מחזיר JSON
res.json({ prices });
```

**GET `/api/dashboard/insight`:**
```javascript
// 1. טוען העדפות - סוג משקיע
const investorType = preferences.investor_type;

// 2. שולח בקשה ל-OpenRouter API (AI)
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'meta-llama/llama-3.2-3b-instruct:free',
  messages: [
    { role: 'system', content: 'You are a crypto analyst...' },
    { role: 'user', content: `Provide insight for ${investorType}...` }
  ]
});

// 3. מחזיר JSON
res.json({ insight: response.data.choices[0].message.content });
```

**GET `/api/dashboard/meme`:**
```javascript
// 1. שולח בקשה ל-Reddit API
const response = await axios.get('https://www.reddit.com/r/cryptomemes/hot.json');

// 2. מסנן רק תמונות
const posts = response.data.data.children.filter(post => post.data.post_hint === 'image');

// 3. בוחר מם אקראי
const randomPost = posts[Math.floor(Math.random() * posts.length)];

// 4. מחזיר JSON
res.json({
  url: randomPost.data.url,
  title: randomPost.data.title
});
```

### איך JSON עובר בין Frontend ל-Backend?

**בקשה (Request):**
```javascript
// Frontend
const response = await api.get('/dashboard/news');

// Backend מקבל
router.get('/news', (req, res) => {
  // עיבוד נתונים...
  res.json({ news: [...] });  // מחזיר JSON
});
```

**תגובה (Response):**
```json
{
  "news": [
    {
      "title": "Bitcoin reaches new highs",
      "url": "https://...",
      "source": { "title": "Crypto News" }
    }
  ]
}
```

---

## 👍 Feedback System

### איך המשוב עובד?

#### 1. המשתמש לוחץ על 👍 או 👎
```javascript
const handleVote = async (contentType, contentId, vote) => {
  await api.post('/dashboard/feedback', {
    content_type: contentType,  // "news", "price", "insight", "meme"
    content_id: contentId,       // מזהה הפריט
    vote: vote                   // 1 (up) או -1 (down)
  });
};
```

#### 2. השרת שומר במסד הנתונים
```javascript
router.post('/feedback', authenticateToken, (req, res) => {
  db.run(
    'INSERT INTO feedback (user_id, content_type, content_id, vote) VALUES (?, ?, ?, ?)',
    [req.user.id, contentType, contentId, vote]
  );
});
```

#### 3. מה נשמר?
```sql
INSERT INTO feedback VALUES (
  user_id: 1,
  content_type: "news",
  content_id: "0",
  vote: 1  -- thumbs up
);
```

### איך זה משפיע על המלצות עתידיות?

#### שלב 1: איסוף נתונים
```sql
SELECT * FROM feedback WHERE user_id = 1;
-- מחזיר כל ההצבעות של המשתמש
```

#### שלב 2: ניתוח דפוסים
```javascript
// מה המשתמש אוהב?
const positiveFeedback = feedback.filter(f => f.vote === 1);
// news: 5 votes, prices: 3 votes, insight: 2 votes

// מה המשתמש לא אוהב?
const negativeFeedback = feedback.filter(f => f.vote === -1);
// meme: 2 votes
```

#### שלב 3: התאמת תוכן
```javascript
// אם המשתמש אוהב news - הצג יותר חדשות
if (positiveFeedback.filter(f => f.content_type === 'news').length > 5) {
  // הצג יותר חדשות בדאשבורד
}

// אם המשתמש לא אוהב memes - הצג פחות ממים
if (negativeFeedback.filter(f => f.content_type === 'meme').length > 3) {
  // הצג פחות ממים
}
```

### בעתיד: אימון מודל ML
```python
# 1. טעינת נתונים
feedback_data = load_feedback_from_db()

# 2. יצירת features
features = [
    user_preferences,
    content_features,
    historical_votes
]

# 3. אימון מודל
model = train_recommendation_model(features, feedback_data)

# 4. המלצות
recommendations = model.predict(user_id)
```

---

## 🤖 AI Service

### איך AI עובד כ-service ולא כקסם?

#### 1. מה זה AI Service?
AI הוא לא קסם - זה שירות חיצוני שמקבל input ומחזיר output.

#### 2. איך זה עובד בפרויקט?

**שלב 1: הכנת Prompt**
```javascript
const investorType = preferences.investor_type;  // "HODLer"
const contentTypes = preferences.content_types;   // ["Market News", "Charts"]

const prompt = `Provide a brief daily crypto market insight for a ${investorType} 
interested in ${contentTypes.join(', ')}. Keep it under 100 words.`;
```

**שלב 2: שליחת בקשה ל-API**
```javascript
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'meta-llama/llama-3.2-3b-instruct:free',  // מודל AI חינמי
  messages: [
    {
      role: 'system',
      content: 'You are a crypto market analyst providing daily insights.'
    },
    {
      role: 'user',
      content: prompt
    }
  ]
}, {
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
  }
});
```

**שלב 3: קבלת תגובה**
```javascript
const insight = response.data.choices[0].message.content;
// "For HODLers: The market shows resilience. Long-term holders should..."
```

#### 3. Fallback - אם AI לא עובד
```javascript
try {
  // ניסיון עם OpenRouter API
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', ...);
  return res.json({ insight: response.data.choices[0].message.content });
} catch (error) {
  // אם נכשל - fallback סטטי
  const staticInsights = {
    'HODLer': 'For HODLers: The market shows resilience...',
    'Day Trader': 'For Day Traders: Watch for key support/resistance levels...',
    // ...
  };
  return res.json({ insight: staticInsights[investorType] });
}
```

### למה זה Service ולא קסם?
- ✅ **API חיצוני** - OpenRouter הוא שירות חיצוני
- ✅ **Input/Output** - מקבל prompt, מחזיר text
- ✅ **ניתן לשליטה** - אנחנו בונים את ה-prompt
- ✅ **Fallback** - אם לא עובד, יש אלטרנטיבה

---

## 🚀 Deployment

### איך לפרוס את הפרויקט?

#### שלב 1: הכנה ל-GitHub

**1. יצירת Repository ב-GitHub**
- היכנס ל-GitHub
- לחץ על "New repository"
- שם: `crypto-dashboard`
- יצירת repository

**2. התקנת Git (אם לא מותקן)**
```bash
git --version  # בדוק אם מותקן
```

**3. אתחול Git בפרויקט**
```bash
cd /Users/yoellchemla/Desktop/moveo_task
git init
git add .
git commit -m "Initial commit: Crypto Dashboard"
```

**4. חיבור ל-GitHub**
```bash
git remote add origin https://github.com/YOUR_USERNAME/crypto-dashboard.git
git branch -M main
git push -u origin main
```

#### שלב 2: פריסת Backend

**אפשרות 1: Render (חינמי)**
1. היכנס ל-https://render.com
2. לחץ על "New" → "Web Service"
3. חבר את ה-GitHub repository
4. הגדרות:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Environment Variables:**
     ```
     PORT=5001
     JWT_SECRET=your-secret-key
     OPENROUTER_API_KEY=your-key
     CRYPTOPANIC_API_KEY=your-key
     ```
5. Render יבנה ויפעיל את השרת
6. תקבל URL: `https://your-app.onrender.com`

**אפשרות 2: Railway**
1. היכנס ל-https://railway.app
2. לחץ על "New Project"
3. חבר את ה-GitHub repository
4. בחר את תיקיית `backend`
5. הוסף environment variables
6. Railway יבנה ויפעיל אוטומטית

#### שלב 3: פריסת Frontend

**אפשרות 1: Vercel (חינמי)**
```bash
cd frontend
npm install -g vercel
vercel
```

**אפשרות 2: Netlify**
1. היכנס ל-https://netlify.com
2. לחץ על "Add new site" → "Import an existing project"
3. חבר את ה-GitHub repository
4. הגדרות:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/build`
   - **Environment Variables:**
     ```
     REACT_APP_API_URL=https://your-backend.onrender.com/api
     ```
5. Netlify יבנה ויפעיל אוטומטית

#### שלב 4: עדכון Frontend
עדכן את `frontend/.env`:
```
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

**חשוב:** אחרי שינוי `.env`, צריך לבנות מחדש:
```bash
cd frontend
npm run build
```

---

## 🏗️ ארכיטקטורה

### איך הכל עובד יחד?

```
┌─────────────────┐
│   Browser       │
│   (Frontend)    │
│   React App     │
└────────┬────────┘
         │ HTTP Requests
         │ (JSON)
         │
         ▼
┌─────────────────┐
│   Backend       │
│   Node.js       │
│   Express      │
└────────┬────────┘
         │
         ├──────────┬──────────┬──────────┐
         │          │          │          │
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ SQLite │ │CoinGecko│ │CryptoPan│ │OpenRouter│
    │   DB   │ │   API   │ │   API   │ │   API   │
    └────────┘ └────────┘ └────────┘ └────────┘
```

### Flow של בקשה:

**1. משתמש לוחץ על כפתור**
```
User clicks "Sign Up" button
```

**2. Frontend שולח בקשה**
```javascript
// Frontend
const response = await api.post('/auth/register', {
  email: 'user@example.com',
  name: 'John',
  password: 'password123'
});
```

**3. Backend מקבל ומעבד**
```javascript
// Backend
router.post('/register', async (req, res) => {
  // 1. בדיקת תקינות
  // 2. הצפנת סיסמה
  // 3. שמירה במסד נתונים
  // 4. יצירת JWT token
  // 5. החזרת תגובה
  res.json({ token, user });
});
```

**4. Frontend מקבל תגובה**
```javascript
// Frontend
const token = response.data.token;
localStorage.setItem('token', token);
// מעבר לדאשבורד
```

### Flow של Daily Dashboard:

**1. משתמש נכנס לדאשבורד**
```
User navigates to /dashboard
```

**2. Frontend טוען נתונים**
```javascript
// Frontend
useEffect(() => {
  loadDashboardData();
}, []);

const loadDashboardData = async () => {
  const [news, prices, insight, meme] = await Promise.all([
    api.get('/dashboard/news'),
    api.get('/dashboard/prices'),
    api.get('/dashboard/insight'),
    api.get('/dashboard/meme')
  ]);
};
```

**3. Backend טוען העדפות**
```javascript
// Backend
router.get('/news', authenticateToken, async (req, res) => {
  // 1. טוען העדפות משתמש
  const preferences = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.id]);
  
  // 2. שולח בקשה ל-API חיצוני
  const response = await axios.get('https://cryptopanic.com/api/v1/posts/');
  
  // 3. מחזיר JSON
  res.json({ news: response.data.results });
});
```

**4. Frontend מציג תוכן**
```javascript
// Frontend
setNews(newsRes.data.news);
setPrices(pricesRes.data.prices);
setInsight(insightRes.data.insight);
setMeme(memeRes.data);
```

### ארכיטקטורת הנתונים:

```
User Registration
    │
    ▼
┌──────────────┐
│   users      │  ← משתמש חדש
└──────────────┘
    │
    ▼
Onboarding Quiz
    │
    ▼
┌──────────────────┐
│user_preferences  │  ← העדפות נשמרות
└──────────────────┘
    │
    ▼
Dashboard Load
    │
    ├──→ GET /news      → CryptoPanic API
    ├──→ GET /prices    → CoinGecko API
    ├──→ GET /insight   → OpenRouter API
    └──→ GET /meme      → Reddit API
    │
    ▼
┌──────────────┐
│  Dashboard   │  ← תוכן מותאם אישית
└──────────────┘
    │
    ▼
User Feedback (👍/👎)
    │
    ▼
┌──────────────┐
│   feedback   │  ← משוב נשמר
└──────────────┘
    │
    ▼
Future Recommendations (עתידי)
```

---

## 📝 סיכום לשאלות בראיון

### מה בנית?
**אפליקציית דאשבורד מותאמת אישית למשקיעי קריפטו** שמציגה:
- חדשות שוק
- מחירי מטבעות
- תובנות AI
- ממים קריפטו

### איזה טכנולוגיות השתמשת?
- **Frontend:** React, React Router, Axios, CSS
- **Backend:** Node.js, Express, SQLite3, bcryptjs, jsonwebtoken
- **APIs:** CoinGecko, CryptoPanic, OpenRouter, Reddit
- **Database:** SQLite

### איך ההתאמה האישית עובדת?
1. משתמש עונה על שאלון אונבורדינג
2. העדפות נשמרות במסד נתונים
3. כל בקשה לדאשבורד טוענת את ההעדפות
4. התוכן מותאם לפי העדפות המשתמש

### איך AI עובד?
- שימוש ב-OpenRouter API (LLM חינמי)
- בניית prompt מותאם לפי סוג המשקיע
- Fallback סטטי אם API לא זמין

### איך מערכת המשוב עובדת?
- כל הצבעה נשמרת במסד נתונים
- בעתיד: ניתן להשתמש בנתונים לאימון מודל ML
- כל משוב מקושר למשתמש ולסוג תוכן

### איך לפרוס?
- Backend: Render/Railway
- Frontend: Vercel/Netlify
- Database: SQLite (קובץ) או PostgreSQL (production)

---

**בהצלחה בראיון! 🚀**
