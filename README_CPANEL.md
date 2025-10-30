# Quick Start: Deploy to cPanel

## 🎯 Fastest Path to Deploy

### Step 1: Build Your App (Windows)

Run this command in the project root:

```batch
build-for-cpanel.bat
```

Or manually:

```bash
cd client
npm install
npm run build
cd ..
```

This creates a `build-for-cpanel` folder with everything ready to upload.

---

## 📤 Step 2: Upload to cPanel

1. **Log into cPanel**
   - Go to: https://yourdomain.com:2083
   - Or your host's cPanel URL

2. **Open File Manager**
   - Click "File Manager" icon
   - Navigate to `public_html` folder

3. **Upload Files**
   - Select all files from `build-for-cpanel` folder
   - Upload to `public_html`
   - **Important**: Include the `.htaccess` file (hidden file, may need to show hidden files)

4. **Set Permissions** (in File Manager)
   - Folders: Right-click → Change Permissions → 755
   - Files: Right-click → Change Permissions → 644

5. **Test Your Site**
   - Visit: https://yourdomain.com

---

## 🔧 Step 3: Deploy Backend API

Your backend needs to run somewhere else. **Recommended: Render.com**

### Deploy to Render.com (Free)

1. **Sign up**: https://render.com

2. **Create Web Service**
   - Connect your GitHub repo
   - Select: `MVFD-Reporting` repository

3. **Configure**
   ```
   Name: mangohick-api
   Root Directory: server
   Build Command: npm install
   Start Command: npm start
   ```

4. **Add Environment Variables** (copy from `server/production.env`):
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

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete
   - Get your URL: `https://your-app.onrender.com`

6. **Update Frontend**
   - Edit `client/production.env`
   - Change: `REACT_APP_API_URL=https://your-app.onrender.com/api`
   - Rebuild and re-upload

---

## ✅ Quick Test

1. **Test Site**: Visit https://yourdomain.com
2. **Test API**: Visit https://your-app.onrender.com/api/health
3. **Try Login**: Use your credentials

---

## 📚 More Info

For detailed instructions, see: **CPANEL_DEPLOYMENT.md**

---

## 🆘 Troubleshooting

### Frontend shows blank page
- Check `.htaccess` is uploaded
- Verify file permissions
- Check browser console for errors

### Can't connect to API
- Verify backend is running on Render
- Check CORS settings
- Update API URL in frontend

### 404 errors on pages
- `.htaccess` file must be in place
- mod_rewrite must be enabled on server
- Contact hosting support if needed

---

## 💡 Recommended Setup

```
┌─────────────────────────────────────────┐
│  cPanel Web Host                        │
│  ├── public_html/                       │
│  │   ├── index.html (React App)         │
│  │   ├── static/                        │
│  │   └── .htaccess                      │
└─────────────────────────────────────────┘
                ↓ API Calls
┌─────────────────────────────────────────┐
│  Render.com (Backend API)               │
│  ├── Server runs here                   │
│  └── Connects to MySQL                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  MySQL Database                         │
│  sdb-86.hosting.stackcp.net             │
│  (Your database)                        │
└─────────────────────────────────────────┘
```

---

## 🎉 You're Done!

Your fire reporting system is now live!

- **Frontend**: https://yourdomain.com
- **Backend**: https://your-app.onrender.com/api
- **Database**: Already configured

