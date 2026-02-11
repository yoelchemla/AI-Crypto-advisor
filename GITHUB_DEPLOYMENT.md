# הוראות פריסה ל-GitHub

## שלב 1: הכנת הפרויקט ל-GitHub

### 1. בדוק אם Git מותקן
```bash
git --version
```

אם לא מותקן, התקן מ-https://git-scm.com

### 2. אתחל Git בפרויקט
```bash
cd /Users/yoellchemla/Desktop/moveo_task
git init
```

### 3. הוסף קבצים
```bash
git add .
```

### 4. יצירת commit ראשוני
```bash
git commit -m "Initial commit: Crypto Investor Dashboard"
```

## שלב 2: יצירת Repository ב-GitHub

### 1. היכנס ל-GitHub
- https://github.com
- התחבר או הירשם

### 2. יצירת Repository חדש
- לחץ על "New" (או "+" → "New repository")
- שם: `crypto-dashboard` (או שם אחר)
- תיאור: "Personalized Crypto Investor Dashboard"
- **אל תסמן** "Initialize with README" (כי כבר יש לנו קבצים)
- לחץ על "Create repository"

### 3. חיבור הפרויקט ל-GitHub
```bash
# החלף YOUR_USERNAME בשם המשתמש שלך ב-GitHub
git remote add origin https://github.com/YOUR_USERNAME/crypto-dashboard.git
git branch -M main
git push -u origin main
```

**אם זה לא עובד, נסה:**
```bash
git remote add origin git@github.com:YOUR_USERNAME/crypto-dashboard.git
```

## שלב 3: עדכון קבצים

אם אתה רוצה לעדכן קבצים:
```bash
git add .
git commit -m "Description of changes"
git push
```

## שלב 4: בדיקה

פתח את ה-URL:
```
https://github.com/YOUR_USERNAME/crypto-dashboard
```

אתה אמור לראות את כל הקבצים!

## הערות חשובות

### מה לא נשמר ב-GitHub?
- קובץ `.env` - לא נשמר (בטוח!)
- `node_modules/` - לא נשמר (גדול מדי)
- `*.db` - לא נשמר (מסד נתונים)

### מה כן נשמר?
- כל קוד המקור
- `package.json` - רשימת dependencies
- קבצי תיעוד
- `.env.example` - דוגמה ל-.env

## פתרון בעיות

### שגיאה: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/crypto-dashboard.git
```

### שגיאה: "Authentication failed"
- ודא שהתחברת ל-GitHub
- אפשר להשתמש ב-GitHub CLI או Personal Access Token

### שגיאה: "Permission denied"
```bash
# בדוק את ההרשאות
git remote -v
# ודא שה-URL נכון
```

---

**בהצלחה! 🚀**
