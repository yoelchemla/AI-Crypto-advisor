# הסבר מפורט על האפליקציה - Crypto Investor Dashboard

## סקירה כללית

בניתי אפליקציית דאשבורד מותאמת אישית למשקיעי קריפטו. האפליקציה לומדת את המשתמש דרך שאלון אונבורדינג קצר ומציגה תוכן יומי מותאם אישית.

## מבנה הפרויקט

### Backend (שרת)
```
backend/
├── server.js          # נקודת הכניסה של השרת
├── database.js        # הגדרת מסד הנתונים SQLite
├── routes/
│   ├── auth.js        # נתיבים לאימות (הרשמה/התחברות)
│   └── dashboard.js  # נתיבים לדאשבורד (חדשות, מחירים, AI, ממים)
└── middleware/
    └── auth.js        # Middleware לאימות JWT
```

### Frontend (לקוח)
```
frontend/
├── src/
│   ├── App.js         # רכיב ראשי עם ניהול routing
│   ├── components/
│   │   ├── Login.js   # דף התחברות
│   │   ├── Signup.js  # דף הרשמה
│   │   ├── Onboarding.js  # שאלון אונבורדינג
│   │   └── Dashboard.js   # דאשבורד ראשי
│   └── utils/
│       └── api.js     # הגדרת axios עם token
```

## שלב 1: הגדרת מסד הנתונים

**קובץ: `backend/database.js`**

מסד הנתונים SQLite מכיל 3 טבלאות:

1. **users** - משתמשים
   - id, email, name, password (מוצפן), created_at

2. **user_preferences** - העדפות משתמש (משאלון האונבורדינג)
   - id, user_id, interested_assets (JSON), investor_type, content_types (JSON)

3. **feedback** - משוב משתמשים (thumbs up/down)
   - id, user_id, content_type, content_id, vote (1 או -1), created_at

**למה SQLite?**
- קל להתקנה (לא צריך שרת נפרד)
- מושלם לפרויקטים קטנים-בינוניים
- עובד מצוין עם Node.js

## שלב 2: מערכת האימות (Authentication)

**קובץ: `backend/routes/auth.js`**

### הרשמה (`/api/auth/register`)
1. מקבל: email, name, password
2. בודק אם המשתמש כבר קיים
3. מצפין את הסיסמה עם bcrypt
4. שומר במסד הנתונים
5. מחזיר JWT token

### התחברות (`/api/auth/login`)
1. מקבל: email, password
2. בודק אם המשתמש קיים
3. משווה סיסמה מוצפנת
4. מחזיר JWT token

**JWT Token:**
- מכיל: id, email, name
- תקף ל-7 ימים
- נשלח בכל בקשה דרך header: `Authorization: Bearer <token>`

**Middleware: `backend/middleware/auth.js`**
- בודק את ה-token בכל בקשה מוגנת
- מוסיף את פרטי המשתמש ל-`req.user`

## שלב 3: שאלון האונבורדינג

**קובץ: `frontend/src/components/Onboarding.js`**

השאלון כולל 3 שלבים:

### שלב 1: נכסי קריפטו מעניינים
- המשתמש בוחר מתוך רשימה: bitcoin, ethereum, cardano וכו'
- אפשר לבחור כמה שרוצים
- הנתונים נשמרים כ-JSON array

### שלב 2: סוג משקיע
- HODLer (מחזיק לטווח ארוך)
- Day Trader (סוחר יומי)
- NFT Collector
- DeFi Enthusiast
- General Investor

### שלב 3: סוגי תוכן
- Market News (חדשות שוק)
- Charts & Analysis (גרפים וניתוח)
- Social Media Trends (טרנדים ברשתות)
- Fun Content & Memes (תוכן כיפי וממים)

**שמירה:**
- כל התשובות נשמרות ב-`user_preferences`
- אחרי השמירה, המשתמש מועבר לדאשבורד

## שלב 4: הדאשבורד

**קובץ: `frontend/src/components/Dashboard.js`**

הדאשבורד מציג 4 חלקים:

### 1. Market News (חדשות שוק)
**API: CryptoPanic**
- `GET /api/dashboard/news`
- מביא חדשות חמות מקריפטו
- Fallback: אם ה-API נכשל, מציג חדשות סטטיות

**קוד:**
```javascript
const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
  params: {
    public: true,
    filter: 'hot',
    currencies: 'BTC,ETH'
  }
});
```

### 2. Coin Prices (מחירי מטבעות)
**API: CoinGecko**
- `GET /api/dashboard/prices`
- מביא מחירים של מטבעות שהמשתמש בחר באונבורדינג
- מציג: שם, מחיר ב-USD, שינוי 24 שעות

**קוד:**
```javascript
const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
  params: {
    ids: coins.join(','),
    vs_currencies: 'usd',
    include_24hr_change: true
  }
});
```

### 3. AI Insight of the Day (תובנת AI יומית)
**API: OpenRouter (או fallback סטטי)**
- `GET /api/dashboard/insight`
- משתמש ב-LLM ליצירת תובנה מותאמת אישית
- לוקח בחשבון: סוג משקיע, העדפות תוכן

**קוד:**
```javascript
// ניסיון עם OpenRouter
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'meta-llama/llama-3.2-3b-instruct:free',
  messages: [
    {
      role: 'system',
      content: 'You are a crypto market analyst...'
    },
    {
      role: 'user',
      content: `Provide insight for ${investorType}...`
    }
  ]
});
```

**Fallback:** אם OpenRouter לא זמין, מציג תובנות סטטיות לפי סוג המשקיע

### 4. Fun Crypto Meme (מם קריפטו)
**API: Reddit (או fallback)**
- `GET /api/dashboard/meme`
- מביא מם אקראי מ-r/cryptomemes
- Fallback: ממים סטטיים

## שלב 5: מערכת המשוב (Voting)

**קובץ: `frontend/src/components/Dashboard.js`**

כל פריט תוכן כולל כפתורי 👍 ו-👎:

```javascript
const handleVote = async (contentType, contentId, vote) => {
  await api.post('/dashboard/feedback', {
    content_type: contentType,  // 'news', 'price', 'insight', 'meme'
    content_id: contentId,       // מזהה הפריט
    vote: vote                   // 1 או -1
  });
};
```

**שמירה במסד הנתונים:**
- כל הצבעה נשמרת ב-`feedback`
- מקושרת למשתמש דרך `user_id`
- ניתן להשתמש בנתונים לאימון מודל המלצות בעתיד

## שלב 6: ניהול State ו-Routing

**קובץ: `frontend/src/App.js`**

### State Management:
- `isAuthenticated` - האם המשתמש מחובר
- `hasCompletedOnboarding` - האם סיים את האונבורדינג
- `loading` - מצב טעינה

### Routing Logic:
1. אם לא מחובר → `/login`
2. אם מחובר אבל לא סיים אונבורדינג → `/onboarding`
3. אם מחובר וסיים → `/dashboard`

### Protected Routes:
- כל נתיב מוגן בודק token ב-localStorage
- אם אין token, מפנה ל-login

## שלב 7: API Integration

**קובץ: `frontend/src/utils/api.js`**

### Axios Instance:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Interceptor:
- מוסיף token אוטומטית לכל בקשה
- Token נשמר ב-localStorage אחרי login

## איך הכל עובד יחד?

### Flow של משתמש חדש:
1. **הרשמה** → `/signup`
   - מזין: שם, אימייל, סיסמה
   - מקבל JWT token
   - מועבר לאונבורדינג

2. **אונבורדינג** → `/onboarding`
   - עונה על 3 שאלות
   - העדפות נשמרות ב-DB
   - מועבר לדאשבורד

3. **דאשבורד** → `/dashboard`
   - רואה 4 חלקים עם תוכן מותאם
   - יכול להצביע על כל פריט
   - יכול לרענן את הדאשבורד

### Flow של משתמש קיים:
1. **התחברות** → `/login`
   - מזין אימייל וסיסמה
   - מקבל JWT token
   - אם סיים אונבורדינג → דאשבורד
   - אם לא → אונבורדינג

## אבטחה

1. **סיסמאות מוצפנות** - bcrypt עם salt rounds = 10
2. **JWT Tokens** - חתומים עם secret key
3. **Protected Routes** - middleware בודק token
4. **CORS** - מוגדר ב-backend
5. **Input Validation** - בדיקות בצד השרת

## APIs חינמיים בשימוש

1. **CoinGecko** - מחירי מטבעות (ללא API key)
2. **CryptoPanic** - חדשות קריפטו (ללא API key ל-public feed)
3. **OpenRouter** - AI insights (דורש API key, אבל יש free tier)
4. **Reddit** - ממים (ללא API key)

## פריסה (Deployment)

### Backend:
- **Render/Railway**: מגדירים environment variables
- **Build**: `npm install`
- **Start**: `node server.js`

### Frontend:
- **Vercel/Netlify**: מגדירים `REACT_APP_API_URL`
- **Build**: `npm run build`
- **Publish**: תיקיית `build`

## שיפורים עתידיים

1. **מערכת המלצות** - שימוש ב-feedback לאימון מודל ML
2. **Real-time Updates** - WebSockets לעדכונים בזמן אמת
3. **Portfolio Tracking** - מעקב אחר תיק השקעות
4. **Alerts** - התראות על שינויים במחירים
5. **Social Features** - שיתוף תובנות עם משתמשים אחרים

## קבצים חשובים לקריאה

1. `FEEDBACK_SYSTEM.md` - הסבר מפורט על מערכת המשוב ואימון מודלים
2. `DEPLOYMENT.md` - הוראות פריסה מפורטות
3. `README.md` - סקירה כללית של הפרויקט

## שאלות נפוצות

**Q: למה React ולא Angular?**
A: React יותר קל ללמידה ויש לו קהילה גדולה. Angular גם יעבוד מצוין.

**Q: למה SQLite ולא PostgreSQL?**
A: SQLite קל יותר להתחלה. ניתן לשדרג ל-PostgreSQL בקלות.

**Q: איך משדרגים ל-production?**
A: ראה `DEPLOYMENT.md` - צריך לשנות את מסד הנתונים ל-PostgreSQL ולהגדיר environment variables.

**Q: איך מוסיפים API keys?**
A: יוצרים קובץ `.env` ב-backend עם המפתחות. ראה `.env.example`.

---

**בהצלחה! 🚀**
