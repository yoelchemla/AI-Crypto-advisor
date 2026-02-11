# פתרון בעיות - Network Error

## בעיה: Network Error בעת הרשמה/התחברות

### פתרון 1: ודא שהשרת רץ

בטרמינל נפרד, הרץ:
```bash
cd backend
npm start
```

אתה אמור לראות:
```
Server running on port 5000
API available at http://localhost:5000/api
```

### פתרון 2: בדוק שהשרת עובד

פתח בדפדפן:
http://localhost:5000/api/health

אתה אמור לראות:
```json
{"status":"OK","message":"Crypto Dashboard API is running"}
```

### פתרון 3: הפעל מחדש את ה-Frontend

אם שינית את קובץ `.env`, צריך להפעיל מחדש:
1. עצור את ה-Frontend (Ctrl+C)
2. הרץ שוב: `npm start`

### פתרון 4: בדוק את ה-URL

בקונסול של הדפדפן (F12), תראה:
```
API Base URL: http://localhost:5000/api
```

אם אתה רואה משהו אחר, בדוק את קובץ `frontend/.env`

### פתרון 5: בדוק CORS

אם אתה רואה שגיאת CORS, ודא שב-`backend/server.js` יש:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### פתרון 6: בדוק שהפורטים פנויים

```bash
# בדוק אם פורט 5000 תפוס
lsof -i :5000

# בדוק אם פורט 3000 תפוס
lsof -i :3000
```

אם הפורטים תפוסים, עצור את התהליכים או שנה את הפורטים.
