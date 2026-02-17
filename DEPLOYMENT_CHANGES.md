# סיכום שינויים לפריסה (Deployment)

## שינויים שבוצעו בקוד

### 1. `backend/server.js` - עדכון CORS לתמיכה בפריסה

**מה השתנה:**
- **לפני:** CORS היה מוגבל רק ל-`http://localhost:3000` (קוד קשיח)
- **אחרי:** CORS דינמי התומך בכתובות מרובות דרך משתנה סביבה `CORS_ORIGIN`

**הקוד החדש:**
```javascript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
```

**למה זה חשוב:**
- בפיתוח מקומי עובד עם localhost
- בפריסה מאפשר רק כתובות מאושרות מה-`CORS_ORIGIN`
- תומך בכמה כתובות מופרדות בפסיק

---

### 2. `render.yaml` - הוספת הערה על CORS_ORIGIN

**מה השתנה:**
- הוספתי הערה שמזכירה שצריך להגדיר `CORS_ORIGIN` אחרי פריסת ה-Frontend

**הקוד החדש:**
```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    generateValue: true
  - key: PORT
    value: 5001
  # CORS_ORIGIN will be set after frontend deployment
  # Format: https://your-frontend-url.vercel.app
```

---

## קבצים שלא שונו (כבר מוכנים לפריסה)

### `frontend/vercel.json` - כבר מוכן
- מכיל הגדרות build ו-SPA routing
- לא נדרש שינוי

### `frontend/src/utils/api.js` - כבר מוכן
- משתמש ב-`process.env.REACT_APP_API_URL`
- כבר תומך בפריסה

---

## מסד הנתונים (Database)

**המסד נתונים נשאר כמו שהוא:**
- SQLite (`crypto_dashboard.db`)
- הקובץ נוצר אוטומטית בפריסה
- כל הנתונים נשמרים בקובץ אחד
- לא נדרש שינוי או הגדרה נוספת

---

## הוראות פריסה

### שלב 1: העלאת הקוד ל-GitHub

```bash
cd /Users/yoellchemla/Desktop/moveo_task
git add .
git commit -m "Prepare for deployment - CORS updates"
git push
```

### שלב 2: פריסת Backend ב-Render

1. היכנס ל-https://render.com
2. **New** → **Blueprint** (או **Web Service**)
3. חבר את ה-GitHub repository
4. Render יקרא את `render.yaml` אוטומטית
5. לחץ **Apply**
6. אחרי שהבנייה מסתיימת, תקבל **Backend URL**, למשל:
   - `https://crypto-dashboard-api.onrender.com`

### שלב 3: פריסת Frontend ב-Vercel

1. היכנס ל-https://vercel.com
2. **Add New** → **Project**
3. ייבא את ה-repository
4. הגדרות:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
5. **Environment Variables:**
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://YOUR-BACKEND-URL.onrender.com/api`
     (החלף `YOUR-BACKEND-URL` ב-URL האמיתי מ-Render)
6. לחץ **Deploy**
7. תקבל **Frontend URL**, למשל:
   - `https://crypto-dashboard-xxxx.vercel.app`

### שלב 4: חיבור Backend ל-Frontend (CORS)

1. ב-Render → השירות שיצרת → **Environment**
2. הוסף:
   - **Key:** `CORS_ORIGIN`
   - **Value:** `https://crypto-dashboard-xxxx.vercel.app`
     (ה-URL המדויק מ-Vercel)
3. **Save Changes** - Render יעשה redeploy אוטומטי

---

## כתובת האפליקציה הסופית

**הכתובת שתתקבל:**
`https://crypto-dashboard-xxxx.vercel.app`

זו הכתובת הציבורית של האפליקציה - אפשר להיכנס אליה, להירשם, לעבור אונבורדינג ולהיכנס לדאשבורד.

---

## בדיקות

### בדיקת Backend:
```
https://YOUR-BACKEND-URL.onrender.com/api/health
```
אמור להחזיר: `{"status":"OK","message":"Crypto Dashboard API is running"}`

### בדיקת Frontend:
פתח את ה-URL מ-Vercel בדפדפן - האפליקציה אמורה לעבוד במלואה.
