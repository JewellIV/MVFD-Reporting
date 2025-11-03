# Frontend Deployment & mysql2 Fix Guide

## 🎯 Part 1: Deploy Frontend to cPanel

### Step 1: Create Production Environment File

✅ Created `client/.env.production` with your Vercel API URL:
```
REACT_APP_API_URL=https://mvfd-reporting.vercel.app/api
```

### Step 2: Rebuild Frontend

```bash
cd client
npm run build
```

This will create a production build in `client/build/`

### Step 3: Copy to Deployment Folder

```bash
# On Windows PowerShell:
cd ..
Copy-Item -Path client\build\* -Destination build-for-cpanel\ -Recurse -Force

# On Mac/Linux:
cp -r client/build/* build-for-cpanel/
```

### Step 4: Verify Files

Make sure `build-for-cpanel/` contains:
- ✅ `index.html`
- ✅ `.htaccess` (for React Router)
- ✅ `static/` folder with JS/CSS
- ✅ All icon files (icon-*.png, favicon.ico, logo192.png)
- ✅ `manifest.json`

### Step 5: Upload to cPanel

1. **Log into cPanel**
2. **Go to File Manager**
3. **Navigate to your subdomain folder:**
   - Usually: `/home/username/reporting/` or `/public_html/reporting/`
   - Check Subdomains in cPanel to find the exact path
4. **Upload ALL contents** from `build-for-cpanel/`
   - Make sure `.htaccess` is uploaded (it's a hidden file)
   - Enable "Show Hidden Files" in File Manager if needed
5. **Set permissions:**
   - Folders: 755
   - Files: 644
   - `.htaccess`: 644

### Step 6: Test Frontend

Visit: `https://reporting.mangohickfire.com`

Should see the login page (not a white screen or directory listing).

---

## 🗄️ Part 2: Fix mysql2 on Vercel

### The Problem

Vercel isn't finding `mysql2` even though it's in `package.json`. This happens because:
- Vercel bundles dependencies from root `package.json`
- But may not include native modules properly
- `mysql2` is a native module that needs compilation

### Solution Options

#### Option 1: Ensure mysql2 is Bundled (Recommended)

The `mysql2` package is already in your root `package.json`. Vercel should bundle it, but we need to ensure it's included:

1. **Verify mysql2 is installed locally:**
   ```bash
   npm list mysql2
   ```

2. **Update vercel.json to ensure all dependencies are included:**
   The current config should work, but we can add explicit includes.

#### Option 2: Use Connection Pooling Service

For production, consider using a MySQL connection pooler like:
- **PlanetScale** (free tier available)
- **AWS RDS Proxy**
- **Google Cloud SQL Proxy**

#### Option 3: Make Database Optional

Already done! The database is lazy-loaded, so the API works without it. Database routes will return errors, but the API won't crash.

### Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project
2. Click **Functions** tab
3. Look for errors about mysql2
4. Check if the package is in the function bundle

### If mysql2 Still Missing

The routes will return 503 errors with helpful messages. The API will still work for:
- ✅ `/api/health` - No database needed
- ✅ Root endpoint `/` - No database needed
- ❌ `/api/auth/*` - Needs database
- ❌ `/api/nemsis/*` - Needs database

### Test Database Connection

Once mysql2 is working, test:
```bash
curl -X POST https://mvfd-reporting.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

---

## ✅ Quick Checklist

### Frontend:
- [ ] Created `client/.env.production` with Vercel API URL
- [ ] Rebuilt frontend: `cd client && npm run build`
- [ ] Copied build to `build-for-cpanel/`
- [ ] Verified `.htaccess` is included
- [ ] Uploaded all files to cPanel subdomain folder
- [ ] Tested: `https://reporting.mangohickfire.com`

### Backend (mysql2):
- [ ] Verified `mysql2` is in root `package.json` ✅ (Already done)
- [ ] Checked Vercel function logs for mysql2 errors
- [ ] Tested `/api/health` endpoint (should work)
- [ ] Tested database routes (may fail until mysql2 works)

---

## 🔧 Troubleshooting

### Frontend Shows White Screen
- Check browser console for errors
- Verify `.htaccess` is uploaded
- Check that `index.html` exists
- Verify API URL is correct in `.env.production`

### Frontend Can't Connect to API
- Check `REACT_APP_API_URL` in build
- Verify CORS settings in Vercel API
- Check browser Network tab for API calls
- Ensure Vercel API is responding

### mysql2 Still Missing
- Check Vercel build logs
- Verify `package.json` has mysql2 in dependencies
- Try removing and re-adding mysql2
- Consider using a database connection service

---

## 📝 Next Steps

After frontend is deployed:
1. Test login page loads
2. Try logging in (may fail if mysql2 not working)
3. Check API calls in browser DevTools
4. Monitor Vercel function logs

Once mysql2 works:
1. Database routes will automatically work
2. Login will function
3. All CRUD operations will work
