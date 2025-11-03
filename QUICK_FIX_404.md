# Quick Fix for 404 Error on /login

## The Problem
Vercel 404 error when accessing `https://reporting.mangohickfire.com/login`

## Root Cause
The domain `reporting.mangohickfire.com` is pointing to Vercel instead of your cPanel hosting.

## Immediate Fix Steps

### Step 1: Check Your DNS
In your domain registrar or cPanel DNS Zone Editor:

1. Look for A record for `reporting.mangohickfire.com`
2. It should point to your **cPanel server IP** (not Vercel)
3. If it points to Vercel, change it to your cPanel IP

### Step 2: Verify cPanel Subdomain
1. Go to cPanel → Subdomains
2. Verify `reporting` subdomain exists
3. Check Document Root (should be something like `/home/username/reporting` or `/public_html/reporting`)

### Step 3: Upload Frontend Files
1. Navigate to the subdomain's document root in File Manager
2. Upload ALL contents from `build-for-cpanel/` folder:
   - `index.html`
   - `.htaccess`
   - `static/` folder (and all contents)
   - `manifest.json`
   - All icon files (icon-*.png, favicon.ico, logo192.png)

### Step 4: Rebuild with Correct API URL
```bash
# 1. Update client/.env.production with your Vercel API URL
# (Find it in Vercel dashboard → Your Project → Settings → Domains)

# 2. Rebuild the frontend
cd client
npm run build

# 3. Copy to deployment folder
# (On Windows PowerShell)
Copy-Item -Path build\* -Destination ..\build-for-cpanel\ -Recurse -Force

# 4. Re-upload to cPanel
```

### Step 5: Test
1. Visit `https://reporting.mangohickfire.com`
2. Should see the login page (no 404)
3. Check browser console for errors

## Alternative: Use Different Domain for API

If you want to keep everything separate:

1. **Frontend**: `reporting.mangohickfire.com` → cPanel
2. **API**: `api.reporting.mangohickfire.com` → Vercel (add custom domain in Vercel)

Then update `client/.env.production`:
```
REACT_APP_API_URL=https://api.reporting.mangohickfire.com/api
```

## Still Getting 404?

1. Clear browser cache (Ctrl+Shift+Delete)
2. Check cPanel error logs
3. Verify `.htaccess` file is uploaded (it's a hidden file - enable "Show Hidden Files" in File Manager)
4. Test with direct URL: `https://reporting.mangohickfire.com/index.html`
