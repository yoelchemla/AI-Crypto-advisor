# Quick Start Guide

## התקנה והרצה מקומית

### דרישות מוקדמות
- Node.js (גרסה 14 ומעלה)
- npm או yarn

### שלב 1: התקנת Backend

```bash
cd backend
npm install
```

צור קובץ `.env`:
```bash
cp .env.example .env
```

ערוך את `.env` והוסף:
```
PORT=5000
JWT_SECRET=your-super-secret-key-change-this
OPENROUTER_API_KEY=your-key-here (אופציונלי)
CRYPTOPANIC_API_KEY=your-key-here (אופציונלי)
```

הרץ את השרת:
```bash
npm start
```

השרת יעבוד על: http://localhost:5000

### שלב 2: התקנת Frontend

פתח טרמינל חדש:
```bash
cd frontend
npm install
```

צור קובץ `.env`:
```bash
cp .env.example .env
```

ערוך את `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

הרץ את האפליקציה:
```bash
npm start
```

האפליקציה תפתח אוטומטית ב: http://localhost:3000

## שימוש באפליקציה

1. **הרשמה**: צור חשבון חדש עם אימייל, שם וסיסמה
2. **אונבורדינג**: ענה על 3 שאלות קצרות
3. **דאשבורד**: צפה בתוכן מותאם אישית
4. **הצבעה**: תן משוב על התוכן עם 👍 או 👎

## בדיקת ה-API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### הרשמה
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"password123"}'
```

### התחברות
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## פתרון בעיות

### השרת לא מתחיל
- בדוק ש-PORT 5000 פנוי
- ודא שהתקנת את כל ה-dependencies (`npm install`)

### Frontend לא מתחבר ל-Backend
- ודא שה-Backend רץ על פורט 5000
- בדוק את `REACT_APP_API_URL` ב-`.env`

### שגיאת CORS
- ודא שה-Backend רץ
- בדוק שה-`cors` middleware מוגדר ב-`server.js`

### מסד נתונים לא נוצר
- הפעל את השרת פעם אחת - המסד נוצר אוטומטית
- בדוק שיש הרשאות כתיבה בתיקיית `backend`

## מבנה הקבצים

```
moveo_task/
├── backend/           # שרת Node.js + Express
│   ├── routes/        # נתיבי API
│   ├── middleware/    # Middleware (אימות)
│   └── database.js    # הגדרת מסד נתונים
├── frontend/          # אפליקציית React
│   ├── src/
│   │   ├── components/  # רכיבי React
│   │   └── utils/       # כלי עזר
└── README.md          # תיעוד ראשי
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות

### Dashboard (דורש authentication)
- `GET /api/dashboard/preferences` - קבלת העדפות
- `POST /api/dashboard/preferences` - שמירת העדפות
- `GET /api/dashboard/news` - חדשות שוק
- `GET /api/dashboard/prices` - מחירי מטבעות
- `GET /api/dashboard/insight` - תובנת AI
- `GET /api/dashboard/meme` - מם קריפטו
- `POST /api/dashboard/feedback` - שליחת משוב

## צעדים הבאים

1. הוסף API keys ל-`.env` לשימוש ב-AI insights
2. התאם את העיצוב לפי העדפותיך
3. הוסף פיצ'רים חדשים
4. פרוס ל-production (ראה `DEPLOYMENT.md`)
