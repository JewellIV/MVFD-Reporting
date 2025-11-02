# Quick Build Guide - Get Your index.html Ready for Upload

## ✅ Step 1: Run the Build Script

You need to run the build script to create the deployment package:

### Option A: Using the Batch File (Windows)
1. Open Command Prompt or PowerShell in your project folder
2. Run:
   ```batch
   build-for-cpanel.bat
   ```
3. Wait for it to complete (will take 1-2 minutes)

### Option B: Manual Build

1. **Open terminal in your project root**

2. **Build the React app:**
   ```bash
   cd client
   npm run build
   ```

3. **Copy files to build folder:**
   ```bash
   cd ..
   mkdir build-for-cpanel
   xcopy client\build\* build-for-cpanel\ /E /I /H /Y
   ```

## ✅ Step 2: Find Your Files

After running the build script, you'll have a `build-for-cpanel` folder with:
- ✅ `index.html` ← This is what you need!
- ✅ `.htaccess`
- ✅ `static/` folder
- ✅ Other files

**Location:** `C:\Users\JFJIV\teeup\MVFD-Reporting\build-for-cpanel\`

## ✅ Step 3: Upload to cPanel

1. Open cPanel → File Manager
2. Go to where your subdomain points (check Subdomains section)
3. Upload ALL files from `build-for-cpanel` folder
4. Make sure `index.html` is in the root of that directory

## 🔍 If You Don't See index.html

**Make sure:**
- The build completed successfully
- You're looking in the `build-for-cpanel` folder (not `client/build`)
- Show hidden files is enabled if using File Explorer

## 🚨 Quick Fix Right Now

If you want to upload immediately, you can use the files from `client/build`:

1. Go to: `C:\Users\JFJIV\teeup\MVFD-Reporting\client\build\`
2. You'll see `index.html` there
3. But you still need `.htaccess` for React Router to work

**Better option:** Run `build-for-cpanel.bat` to get everything ready!

