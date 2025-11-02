# Fix: Frontend Not Showing (API Server Responding Instead)

## 🔴 Problem
When you visit `https://reporting.mangohickfire.com`, you see the API server JSON response instead of your React frontend.

## ✅ Solution

Your subdomain is pointing to the Node.js API server instead of the static frontend files. Here's how to fix it:

### Step 1: Upload Frontend Files to cPanel

1. **Make sure you have the built files:**
   - Run `build-for-cpanel.bat` if you haven't already
   - Or use files from `client/build/` folder

2. **Login to cPanel → File Manager**

3. **Check where your subdomain points:**
   - Go to **Subdomains** in cPanel
   - Find `reporting` subdomain
   - Note the **Document Root** (usually `public_html/reporting` or `public_html`)

4. **Navigate to that folder in File Manager**

5. **Delete everything in that folder** (or move it to backup)

6. **Upload ALL files from `build-for-cpanel` folder:**
   - `index.html`
   - `.htaccess` ← **IMPORTANT!**
   - `static/` folder
   - All other files

### Step 2: Configure Apache to Proxy API Requests

You need to configure Apache (via `.htaccess` or cPanel) to:
- Serve static files directly
- Proxy `/api/*` requests to your Node.js backend

#### Option A: Backend on Render.com (Recommended)

1. **Deploy backend to Render.com** (see `RENDER_DEPLOYMENT_GUIDE.md`)

2. **Update `client/production.env`:**
   ```
   REACT_APP_API_URL=https://your-app.onrender.com/api
   ```

3. **Rebuild frontend:**
   ```batch
   build-for-cpanel.bat
   ```

4. **Re-upload to cPanel**

#### Option B: Backend on Same Server (Advanced)

If your Node.js server is running on the same cPanel server:

1. **Create `.htaccess` in your subdomain root:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Proxy API requests to Node.js server
  RewriteCond %{REQUEST_URI} ^/api
  RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Rewrite everything else to index.html (for React Router)
  RewriteRule ^ index.html [L]
</IfModule>
```

**Note:** This requires `mod_proxy` and `mod_rewrite` enabled in Apache.

### Step 3: Verify Setup

1. **Visit:** `https://reporting.mangohickfire.com`
   - Should show your React app (not JSON)

2. **Check API:**
   - `https://reporting.mangohickfire.com/api/health`
   - Should return health check JSON

## 🔧 Quick Fix Right Now

**Easiest solution:**

1. **Upload frontend files to cPanel:**
   - Use files from `build-for-cpanel` folder
   - Upload to your subdomain's document root

2. **Deploy backend separately:**
   - Use Render.com (free)
   - Update `REACT_APP_API_URL` in `client/production.env`
   - Rebuild and re-upload

3. **Or use separate subdomain:**
   - `reporting.mangohickfire.com` → Frontend (static files)
   - `api.mangohickfire.com` → Backend (Node.js server)

## 📋 Checklist

- [ ] Frontend files uploaded to cPanel subdomain directory
- [ ] `.htaccess` file uploaded and visible
- [ ] Backend deployed (Render.com or separate server)
- [ ] `REACT_APP_API_URL` updated in production.env
- [ ] Frontend rebuilt with correct API URL
- [ ] Files re-uploaded after rebuild
- [ ] Site shows React app (not API JSON)
- [ ] API endpoints work at `/api/*`

## 🚨 Common Issues

**Still seeing API JSON?**
- Files not uploaded correctly
- Wrong directory (check subdomain document root)
- Apache not serving static files

**404 errors on routes?**
- `.htaccess` not uploaded
- `mod_rewrite` not enabled
- Wrong `.htaccess` content

**API calls failing?**
- Wrong `REACT_APP_API_URL`
- CORS issues (check backend CORS settings)
- Backend not running

