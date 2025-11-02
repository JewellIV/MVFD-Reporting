# 🚨 URGENT FIX: Frontend Not Showing

## The Problem
Your subdomain `reporting.mangohickfire.com` is pointing to your Node.js API server instead of your React frontend.

## ✅ Solution (5 Steps)

### Step 1: Check Your Files Are Ready
You should have a `build-for-cpanel` folder with:
- ✅ `index.html`
- ✅ `.htaccess`
- ✅ `static/` folder

If not, the `.htaccess` is in `client/build/.htaccess` - make sure it's there.

### Step 2: Login to cPanel

### Step 3: Find Your Subdomain Directory
1. Go to **Subdomains** in cPanel
2. Find `reporting` subdomain
3. Look at the **Document Root** column
4. Note the path (probably `public_html/reporting` or just `public_html`)

### Step 4: Upload Files
1. Open **File Manager**
2. Go to the Document Root folder from Step 3
3. **DELETE everything currently there** (it's the API server files)
4. Upload ALL files from `build-for-cpanel` folder:
   - Select all files
   - Upload
   - **Make sure `.htaccess` is uploaded!** (enable "Show Hidden Files" in File Manager)

### Step 5: Set File Permissions
- Folders: `755`
- Files: `644`

## ⚠️ Important: Backend API

Your frontend expects the API at `https://reporting.mangohickfire.com/api`.

**Option A:** Deploy backend to Render.com (recommended - free)
- Follow `RENDER_DEPLOYMENT_GUIDE.md`
- Update `client/production.env` with Render URL
- Rebuild and re-upload

**Option B:** Configure Apache to proxy `/api` requests
- Need `mod_proxy` enabled (contact host)
- More complex setup

## ✅ Test
Visit: `https://reporting.mangohickfire.com`
Should show your React app, NOT the JSON API response!

