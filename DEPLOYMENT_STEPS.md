# פריסת הפרויקט (Deploy) – הוראות וסיכום שינויים

## מה בוצע בפרויקט כדי שיעבוד בפריסה

### 1. שינויים בקוד

#### `frontend/src/App.js`
- **בעיה:** הכתובת ל-API הייתה קבועה: `http://localhost:5000/api/dashboard/preferences`, ולכן בפריסה הבקשות היו נשלחות ל-localhost.
- **שינוי:** השימוש ב-`process.env.REACT_APP_API_URL` (או ברירת מחדל ל-localhost בפיתוח), ובניית ה-URL לבקשה בהתאם:
  - `const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';`
  - `fetch(\`${apiUrl}/dashboard/preferences\`, ...)`
- **תוצאה:** באתר שמועלה (Vercel) תגדיר `REACT_APP_API_URL` לכתובת ה-Backend האמיתית, והאפליקציה תפנה לשרת הנכון.

#### `backend/server.js`
- **בעיה:** CORS היה מוגבל ל-`http://localhost:3000`, ולכן דפדפן שנפתח מאתר מפורסם (למשל `https://xxx.vercel.app`) היה נחסם.
- **שינוי:** CORS מוגדר דינמית:
  - אם קיים `CORS_ORIGIN` (משתנה סביבה) – משתמשים בו (אפשר כמה מופרדים בפסיק).
  - אחרת – משתמשים ב-`http://localhost:3000` לפיתוח.
  - בנוסף, מאפשרים גם בקשות ללא `origin` (למשל כלי בדיקה).
- **תוצאה:** בפריסה תגדיר `CORS_ORIGIN` לכתובת האתר (למשל `https://your-app.vercel.app`), והדפדפן יאפשר בקשות מהאתר ל-Backend.

### 2. קבצי תצורה חדשים

#### `render.yaml` (בשורש הפרויקט)
- **מטרה:** הגדרת שירות ה-Backend ב-Render.
- **תוכן:** שירות מסוג `web`, runtime `node`, תיקיית שורש `backend`, פקודות build ו-start, ומשתני סביבה (כולל `JWT_SECRET` אוטומטי ו-`PORT`).
- **איך זה עובד:** כשמחברים את ה-repo ל-Render ומשתמשים ב-Blueprint, Render קורא את `render.yaml` ומגדיר את השירות בהתאם. השרת רץ מתוך התיקייה `backend`.

#### `frontend/vercel.json`
- **מטרה:** התאמת הפרונטאנד ל-Vercel ו-SPA routing.
- **תוכן:** `buildCommand`, `outputDirectory: "build"`, `framework: "create-react-app"`, ו-`rewrites` שמפנים את כל הנתיבים ל-`/index.html`.
- **איך זה עובד:** Vercel מריץ `npm run build` ומגיש את התיקייה `build`. ה-rewrites מבטיחים שכל route (למשל `/dashboard`, `/login`) יגיע ל-`index.html` ו-React Router יטפל בהם.

#### עדכון `backend/.env.example`
- **הוספה:** `CORS_ORIGIN=http://localhost:3000`
- **מטרה:** להזכיר שבפריסה יש להגדיר `CORS_ORIGIN` לכתובת האתר (למשל ה-URL של Vercel).

---

## איך לפרוס בפועל ולקבל URL

אתה צריך שני כתובות:
1. **Backend URL** – הכתובת של ה-API (למשל מ-Render).
2. **Frontend URL** – הכתובת של האתר (למשל מ-Vercel). **זו כתובת האפליקציה שאותה תספק כתובת ה-URL של הפרויקט.**

### שלב 1: העלאת הקוד ל-GitHub

אם עדיין לא:

```bash
cd /Users/yoellchemla/Desktop/moveo_task
git init
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/crypto-dashboard.git
git branch -M main
git push -u origin main
```

(החלף `YOUR_USERNAME` בשם המשתמש שלך ב-GitHub.)

---

### שלב 2: פריסת ה-Backend ב-Render

1. היכנס ל-**https://render.com** והתחבר (או הירשם עם GitHub).
2. **New** → **Web Service**.
3. חבר את ה-**GitHub repository** של הפרויקט.
4. הגדרות:
   - **Name:** `crypto-dashboard-api` (או שם אחר).
   - **Root Directory:** `backend` (חשוב – Render ירוץ מהתיקייה הזו).
   - **Runtime:** Node.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables** (לחץ Add):
   - `JWT_SECRET` – מחרוזת אקראית ארוכה (למשל מהאתר https://generate-secret.vercel.app).
   - `NODE_ENV` = `production`
   - `CORS_ORIGIN` – **כרגע השאר ריק**; נוסיף אחרי שנפרוס את ה-Frontend.
6. **Create Web Service**.
7. Render יבנה ויפעיל את השרת. בסיום תקבל **Backend URL**, למשל:
   - `https://crypto-dashboard-api.onrender.com`
8. בדיקה: פתח בדפדפן:
   - `https://YOUR-BACKEND-URL.onrender.com/api/health`
   - אמור להחזיר JSON עם `"status":"OK"`.

---

### שלב 3: פריסת ה-Frontend ב-Vercel

1. היכנס ל-**https://vercel.com** והתחבר עם GitHub.
2. **Add New** → **Project**.
3. ייבא את **אותו repository**.
4. הגדרות:
   - **Root Directory:** לחץ **Edit** ובחר `frontend`.
   - **Framework Preset:** Create React App (Vercel יזהה אוטומטית).
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. **Environment Variables** – הוסף:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://YOUR-BACKEND-URL.onrender.com/api`  
     (החלף `YOUR-BACKEND-URL` ב-URL האמיתי מ-Render, **בלי** סלאש בסוף.)
6. **Deploy**.
7. בסיום תקבל **Frontend URL**, למשל:
   - `https://crypto-dashboard-xxx.vercel.app`  
   **זו כתובת האפליקציה – את ה-URL הזה תספק כדרישה.**

---

### שלב 4: חיבור Backend ל-Frontend (CORS)

1. ב-**Render** → השירות שיצרת → **Environment**.
2. הוסף או עדכן:
   - **Key:** `CORS_ORIGIN`
   - **Value:** `https://crypto-dashboard-xxx.vercel.app`  
     (ה-URL המדויק שקיבלת מ-Vercel, בלי סלאש בסוף.)
3. **Save Changes** – Render יעשה redeploy אוטומטי.

מעכשיו הדפדפן יאפשר לאתר ב-Vercel לשלוח בקשות ל-Backend ב-Render.

---

## סיכום: איפה בוצעו שינויים ואיך זה עובד

| מקום | מה בוצע | איך זה עובד |
|------|---------|-------------|
| **frontend/src/App.js** | בדיקת onboarding משתמשת ב-`REACT_APP_API_URL` | ב-build ב-Vercel מוזרק ה-URL של ה-API, וכל הבקשות הולכות לשרת המפורסם. |
| **backend/server.js** | CORS דינמי לפי `CORS_ORIGIN` | ב-Render מגדירים את כתובת האתר ב-`CORS_ORIGIN`, והדפדפן מאפשר בקשות מהאתר ל-API. |
| **render.yaml** | הגדרת שירות Backend ב-Render | Render קורא את הקובץ (או משתמש ב-Root Directory + build/start) ומפעיל את השרת מתוך `backend`. |
| **frontend/vercel.json** | Build ו-SPA routing | Vercel בונה עם `npm run build`, מגיש את `build`, ומפנה כל path ל-`index.html` כדי ש-React Router יעבוד. |
| **backend/.env.example** | הוספת `CORS_ORIGIN` | מזכיר לך להגדיר את כתובת האתר ב-production. |

**כתובת האפליקציה (URL לפרויקט):**  
זו כתובת ה-**Frontend** שקיבלת מ-Vercel, למשל:  
**https://crypto-dashboard-xxxx.vercel.app**

אפשר להיכנס אליה בדפדפן, להירשם, לעבור אונבורדינג ולהיכנס לדאשבורד – כל התקשורת ל-API תיעשה אוטומטית לכתובת ה-Backend שהגדרת ב-`REACT_APP_API_URL`.
