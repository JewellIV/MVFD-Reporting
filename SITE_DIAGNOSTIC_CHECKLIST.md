# Site Diagnostic Checklist - reporting.mangohickfire.com

## 🔍 Step 1: Verify Files Are Uploaded Correctly

**In cPanel File Manager, check your subdomain folder has:**

- [ ] `index.html` (708 bytes)
- [ ] `.htaccess` (451 bytes) - **Enable "Show Hidden Files" to see this!**
- [ ] `static/` folder
- [ ] `static/js/main.a0182cf3.js` (should be ~103KB)
- [ ] `static/css/main.88e4b976.css` (should be ~4.77KB)
- [ ] `manifest.json`
- [ ] `sw.js`

## 🔍 Step 2: Test Direct File Access

Visit these URLs directly to verify files are accessible:

1. **HTML File:**
   - ✅ `https://reporting.mangohickfire.com/index.html`
   - Should show the page (even if blank/error)

2. **JavaScript File:**
   - ✅ `https://reporting.mangohickfire.com/static/js/main.a0182cf3.js`
   - Should download or show JavaScript code
   - **Check:** Does it say `main.a0182cf3.js` or an old file like `main.26c2ee7c.js`?

3. **CSS File:**
   - ✅ `https://reporting.mangohickfire.com/static/css/main.88e4b976.css`
   - Should show CSS code

4. **.htaccess:**
   - Visit: `https://reporting.mangohickfire.com/test-route-that-doesnt-exist`
   - Should redirect to login or show React app
   - If 404, `.htaccess` might not be working

## 🔍 Step 3: Browser Console Diagnostics

**Press F12 → Console tab and check:**

1. **What JavaScript file is loading?**
   - Look for errors mentioning file names
   - Should see `main.a0182cf3.js` not older versions

2. **Any CORS errors?**
   - Look for red errors mentioning "CORS" or "Access-Control-Allow-Origin"

3. **Any 404 errors?**
   - Files not found = files not uploaded correctly

4. **Network tab:**
   - Press F12 → Network tab → Refresh page
   - Check:
     - `index.html` → Status should be 200
     - `main.a0182cf3.js` → Status should be 200 (not 404!)
     - `main.88e4b976.css` → Status should be 200

## 🔍 Step 4: Check Which Build Version Is Loading

**In browser console, run:**
```javascript
// Check which JS file actually loaded
Array.from(document.querySelectorAll('script')).forEach(s => console.log(s.src))
```

Should show: `https://reporting.mangohickfire.com/static/js/main.a0182cf3.js`

## 🔍 Step 5: Common Issues & Fixes

### Issue 1: Old JavaScript File Still Loading
**Symptom:** Console shows old file like `main.26c2ee7c.js` instead of `main.a0182cf3.js`

**Fix:**
1. Clear browser cache completely (Ctrl+Shift+Delete → All time)
2. Hard refresh: Ctrl+F5
3. Test in incognito window
4. Check server isn't caching (contact host if needed)

### Issue 2: .htaccess Not Working
**Symptom:** Routes give 404 errors

**Fix:**
1. Verify `.htaccess` is uploaded (enable hidden files in File Manager)
2. Check file permissions (should be 644)
3. Contact host to ensure `mod_rewrite` is enabled

### Issue 3: Files Not Uploaded
**Symptom:** 404 errors for JS/CSS files

**Fix:**
1. Verify all files from `build-for-cpanel` are uploaded
2. Check folder structure matches exactly
3. Ensure `static/` folder contents are uploaded

### Issue 4: Wrong Directory
**Symptom:** Site shows directory listing or different content

**Fix:**
1. Check cPanel → Subdomains → Document Root
2. Verify files are in that exact folder
3. `index.html` must be in the root of that folder

## 🔍 Step 6: API Configuration Check

**Check if API is configured correctly:**

1. **In browser console, check:**
   ```javascript
   console.log(process.env.REACT_APP_API_URL || 'Not set')
   ```

2. **Verify API endpoint:**
   - Visit: `https://reporting.mangohickfire.com/api/health`
   - Should return JSON, not error

3. **Check CORS:**
   - If API calls fail with CORS error, backend needs CORS configuration

## 📋 Quick Diagnostic Test

**Run this in browser console on your site:**
```javascript
// Check if React loaded
console.log('React version:', React?.version || 'React not found');

// Check if root element exists
console.log('Root element:', document.getElementById('root'));

// Check loaded scripts
console.log('Scripts:', Array.from(document.querySelectorAll('script')).map(s => s.src));

// Check for errors
console.log('Error count:', document.querySelectorAll('.error').length);
```

## 🚨 Still Having Issues?

**Share:**
1. What you see when visiting `https://reporting.mangohickfire.com`
2. Browser console errors (F12 → Console)
3. Network tab showing which files load/fail (F12 → Network)
4. Confirmation of which JS file is loading (from Network tab)

