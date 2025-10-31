# cPanel Quick Start Guide 🚀

**Fastest way to deploy to cPanel hosting**

## ⚡ Quick Steps

### 1️⃣ Build Frontend (Windows)

```batch
build-for-cpanel.bat
```

Wait for it to finish. You'll have a `build-for-cpanel` folder.

### 2️⃣ Upload to cPanel

1. Login to cPanel
2. Open File Manager
3. Go to `public_html`
4. Upload ALL files from `build-for-cpanel`
5. Make sure `.htaccess` is included!
6. Set permissions: Folders=755, Files=644

### 3️⃣ Deploy Backend to Render.com

1. Go to https://render.com
2. Create account & login
3. New → Web Service
4. Connect GitHub repo
5. Configure:
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
6. Add environment variables (see below)
7. Deploy!

### 4️⃣ Update API URL

Edit `client/production.env`:
```
REACT_APP_API_URL=https://your-app.onrender.com/api
```

Rebuild and re-upload.

---

## 🔑 Environment Variables for Backend

Copy these to Render.com environment settings:

```
NODE_ENV=production
PORT=10000
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$
JWT_SECRET=MVFD2024SecureJWTSecretKeyForProductionUseOnly32+
JWT_EXPIRE=24h
ENCRYPTION_KEY=MVFD2024EncryptionKey32C
CORS_ORIGIN=https://yourdomain.com
```

---

## ✅ Test

- Frontend: https://yourdomain.com
- Backend: https://your-app.onrender.com/api/health

---

## 🚨 Important Note

**The critical deployment issue has been FIXED!**

A MongoDB-to-Sequelize compatibility layer has been added to `server/index.js`. This allows your routes to work with the MySQL/Sequelize models.

For details, see [CRITICAL_DEPLOYMENT_FIX.md](CRITICAL_DEPLOYMENT_FIX.md)

---

## 📖 Full Guide

See [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md) for complete instructions

