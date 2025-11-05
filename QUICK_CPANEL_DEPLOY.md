# Quick cPanel Deployment Guide

## TL;DR - Fastest Way to Deploy

### 1. Build Frontend (2 minutes)

```powershell
# In project root
.\build-for-cpanel.bat
```

### 2. Deploy Frontend to cPanel (5 minutes)

1. Upload ALL files from `build-for-cpanel/` to `public_html/`
2. Make sure `.htaccess` is uploaded
3. Set permissions: folders 755, files 644

### 3. Deploy Backend to Render.com (10 minutes)

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secret-here
   DB_HOST=sdb-86.hosting.stackcp.net
   DB_NAME=your-db-name
   DB_USER=your-db-user
   DB_PASS=your-db-pass
   CLIENT_URL=https://yourdomain.com
   CORS_ORIGIN=https://yourdomain.com
   ```
6. Deploy and copy the URL

### 4. Update Frontend API URL (2 minutes)

1. Rebuild frontend with backend URL:
   ```powershell
   $env:REACT_APP_API_URL="https://your-backend.onrender.com/api"
   .\build-for-cpanel.bat
   ```
2. Re-upload to cPanel

### 5. Test (2 minutes)

Visit `https://yourdomain.com` and login!

---

## That's It! 🎉

Your site should now be working:
- Frontend: `https://yourdomain.com` (cPanel)
- Backend: `https://your-backend.onrender.com` (Render.com)
- Database: MySQL on cPanel

---

## Need More Details?

See `CPANEL_FULL_DEPLOYMENT.md` for complete instructions.

