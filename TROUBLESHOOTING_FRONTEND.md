# Troubleshooting: Frontend Not Loading on cPanel

## 🔍 Diagnostic Steps

### 1. Check File Location
**In cPanel File Manager:**
- Go to where your `reporting` subdomain points
- You should see:
  - ✅ `index.html` (directly in this folder)
  - ✅ `.htaccess` (directly in this folder - enable "Show Hidden Files")
  - ✅ `static/` folder
  - ✅ Other files

**If files are in a subfolder, that's wrong!**

### 2. Check Browser Console
Press `F12` in your browser and check:
- **Console tab:** Any red errors?
- **Network tab:** Are files loading? (check for 404s)

**Common errors:**
- `404` on `.js` or `.css` files → Path issue
- `CORS` errors → API configuration
- Blank page → JavaScript error

### 3. Verify .htaccess is Working

**Test:** Visit `https://reporting.mangohickfire.com/test-route`

- ✅ Shows your React app → `.htaccess` is working
- ❌ Shows 404 → `.htaccess` not working

**If .htaccess not working:**
1. Make sure it's uploaded (starts with a dot)
2. Check file permissions (644)
3. Some hosts disable `.htaccess` - contact support

### 4. Check File Permissions

**In cPanel File Manager:**
- Right-click each folder → "Change Permissions"
- Folders: `755`
- Files: `644`
- `.htaccess`: `644`

### 5. Check Direct File Access

Try accessing directly:
- `https://reporting.mangohickfire.com/index.html` → Should show page
- `https://reporting.mangohickfire.com/static/js/main.4da8b14f.js` → Should download JS file

**If these don't work:**
- Files not uploaded correctly
- Wrong directory
- Permissions issue

### 6. Clear Browser Cache

1. Press `Ctrl+Shift+Delete`
2. Clear cached files
3. Hard refresh: `Ctrl+F5`

### 7. Check Subdomain Configuration

**In cPanel → Subdomains:**
- Verify `reporting` subdomain exists
- Check Document Root matches where you uploaded files
- Make sure it's enabled

## 🛠️ Common Fixes

### Fix 1: Simple .htaccess (If Current One Fails)

Create a minimal `.htaccess`:

```apache
RewriteEngine On
RewriteBase /

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### Fix 2: Check index.html Paths

Open `index.html` and check the paths:
- Should be: `/static/js/main.xxx.js`
- NOT: `static/js/main.xxx.js` (missing leading slash)

### Fix 3: Re-upload Files

1. Delete everything in subdomain folder
2. Re-upload from `build-for-cpanel` folder
3. Make sure `.htaccess` is included
4. Set permissions

### Fix 4: Contact Host Support

If `.htaccess` still doesn't work:
- Ask if `mod_rewrite` is enabled
- Ask if `.htaccess` is allowed
- Some hosts require different configuration

## ✅ Quick Test Checklist

Visit these URLs and report what you see:

1. `https://reporting.mangohickfire.com/` → ???
2. `https://reporting.mangohickfire.com/index.html` → ???
3. `https://reporting.mangohickfire.com/static/js/main.4da8b14f.js` → ???
4. Open browser console (F12) → Any errors?

## 🚨 Still Not Working?

Share:
1. What you see when visiting the URL (screenshot if possible)
2. Browser console errors (F12 → Console tab)
3. Network tab showing what's loading/failing
4. Confirmation that `index.html` is in the root of the subdomain folder

