# Icon Setup Guide

## ✅ Icons Generated

All required PWA icons have been generated and placed in `client/public/`:

- ✅ `icon-72x72.png`
- ✅ `icon-96x96.png`
- ✅ `icon-128x128.png`
- ✅ `icon-144x144.png`
- ✅ `icon-152x152.png`
- ✅ `icon-192x192.png`
- ✅ `icon-384x384.png`
- ✅ `icon-512x512.png`
- ✅ `favicon.ico` (32x32 PNG format)
- ✅ `logo192.png` (for Apple touch icon)
- ✅ `icon.svg` (source SVG)

## 🎨 Icon Design

The icons feature:
- Red background (#dc2626) matching the app theme
- White fire department badge/logo
- "MVFD" text on larger sizes
- Consistent styling across all sizes

## 📦 Regenerating Icons

If you need to regenerate icons (e.g., after changing the SVG):

```bash
cd client
npm run generate-icons
```

Or manually edit `client/public/icon.svg` and run the script again.

## 🚀 Deployment

These icons are automatically included when you build the React app:

```bash
cd client
npm run build
```

The icons will be copied to `client/build/` and should resolve the 404 errors on:
- `reporting.mangohickfire.com` (cPanel frontend)
- Vercel deployments

## 🔍 Verification

After deployment, verify icons load correctly:
- Check browser console for 404 errors
- Test PWA installation (icons should appear)
- Verify favicon appears in browser tab

## 📝 Notes

- The `favicon.ico` is generated as PNG format (browsers accept this)
- All icons are optimized PNG files
- Icons follow PWA best practices (maskable support)
