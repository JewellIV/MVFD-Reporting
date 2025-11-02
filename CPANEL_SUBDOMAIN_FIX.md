# Fix: reporting.mangohickfire.com Shows Directory Listing

## 🔴 Problem
When you visit `https://reporting.mangohickfire.com`, you see a directory listing instead of your website.

## ✅ Solution

The subdomain `reporting.mangohickfire.com` is pointing to the wrong directory. Here's how to fix it:

### Option 1: Move Files to Subdomain Directory (Easiest)

1. **Login to cPanel**

2. **Open File Manager**

3. **Check where your subdomain points:**
   - In File Manager, look for a folder called `reporting` 
   - It might be at: `/public_html/reporting` or `/home/username/reporting`

4. **Upload your files there:**
   - Go to the `reporting` folder (wherever it is)
   - Upload ALL contents from your `build-for-cpanel` folder
   - Make sure `index.html` is in that folder (not in a subfolder)

5. **Verify:**
   - The folder should contain:
     - `index.html` ← **This must be in the root of the reporting folder**
     - `.htaccess`
     - `static/` folder
     - Other files

### Option 2: Change Subdomain Document Root (Recommended)

1. **Login to cPanel**

2. **Go to "Subdomains"** (under "Domains" section)

3. **Find `reporting` subdomain** in the list

4. **Click "Change" or "Edit"** next to the Document Root

5. **Change the Document Root to:**
   ```
   public_html
   ```
   Or if that doesn't work:
   ```
   /public_html
   ```

6. **Click "Change" or "Save"**

7. **Now upload files to `public_html`:**
   - Go to File Manager
   - Navigate to `public_html`
   - Upload ALL contents from `build-for-cpanel` folder
   - Make sure `index.html` is directly in `public_html`

### Option 3: Delete and Recreate Subdomain

If the above doesn't work:

1. **Delete the subdomain:**
   - Go to cPanel → Subdomains
   - Find `reporting` and click "Remove"

2. **Recreate it:**
   - Click "Create a Subdomain"
   - Subdomain: `reporting`
   - Domain: `mangohickfire.com` (select from dropdown)
   - Document Root: `public_html` ← **Important!**
   - Click "Create"

3. **Upload files to `public_html`**

## 📋 Step-by-Step Upload Instructions

1. **Build your frontend** (if not already done):
   ```batch
   build-for-cpanel.bat
   ```

2. **Login to cPanel → File Manager**

3. **Navigate to the correct directory:**
   - If subdomain points to `public_html` → go to `public_html`
   - If subdomain points to `public_html/reporting` → go to `public_html/reporting`

4. **Select ALL files in `build-for-cpanel` folder on your computer**

5. **Upload them to cPanel**:
   - Click "Upload" button
   - Select all files
   - Wait for upload to complete

6. **Verify `.htaccess` is uploaded:**
   - In File Manager, make sure "Show Hidden Files" is enabled
   - You should see `.htaccess` file
   - If not, upload it manually (it's important for React Router!)

7. **Set Permissions:**
   - Folders: `755`
   - Files: `644`
   - `.htaccess`: `644`

## 🔍 How to Check Where Your Subdomain Points

1. **In cPanel → Subdomains**
2. **Look at the "Document Root" column**
3. **That's where you need to upload your files**

## ✅ Test After Fix

Visit: `https://reporting.mangohickfire.com`

You should see your React app, not a directory listing.

## 🚨 Important Notes

- **Always upload `index.html`** to the Document Root directory
- **Make sure `.htaccess` is uploaded** (enables React Router)
- **Clear browser cache** if you still see old content
- **Check file permissions** if you get 403 errors

## 📁 File Structure Should Look Like:

```
public_html/          (or public_html/reporting/)
├── index.html        ← Must be here!
├── .htaccess         ← Must be here!
├── manifest.json
├── offline.html
├── sw.js
└── static/
    ├── css/
    │   └── main.[hash].css
    └── js/
        └── main.[hash].js
```

If you see this structure, your site should work!

