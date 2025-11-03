# Domain Configuration Guide

## ⚠️ Current Issue: 404 on Frontend Routes

If you're seeing a Vercel 404 error when accessing `https://reporting.mangohickfire.com/login`, this means the domain is pointing to Vercel instead of your cPanel hosting.

## 🎯 Correct Setup

### Frontend (React App)
- **Domain**: `reporting.mangohickfire.com`
- **Hosting**: cPanel (Apache)
- **Location**: Upload contents of `build-for-cpanel/` to your cPanel document root

### Backend (API)
- **Hosting**: Vercel (Serverless Functions)
- **Domain**: Your Vercel deployment URL (e.g., `mvfd-reporting.vercel.app`)
- **Purpose**: API endpoints only (`/api/*`)

## 🔧 DNS Configuration

### Option 1: Separate Domains (Recommended)

**For Frontend:**
```
reporting.mangohickfire.com  →  A Record  →  Your cPanel Server IP
```

**For API:**
- Use Vercel's automatically assigned domain, OR
- Add a custom domain in Vercel settings (e.g., `api.mangohickfire.com`)
- Update `REACT_APP_API_URL` in your frontend build to point to the API domain

### Option 2: Single Domain with Subdomain Routing

If you want both on the same domain:

```
reporting.mangohickfire.com          →  cPanel (Frontend)
api.reporting.mangohickfire.com      →  Vercel (Backend)
```

Then update your frontend `.env`:
```bash
REACT_APP_API_URL=https://api.reporting.mangohickfire.com/api
```

## 🚀 Deployment Steps

### 1. Deploy Frontend to cPanel

```bash
# Build the frontend
cd client
npm run build

# Copy to deployment folder
cp -r build/* ../build-for-cpanel/

# Upload build-for-cpanel/ contents to:
# cPanel File Manager → reporting subdomain document root
```

### 2. Deploy Backend to Vercel

```bash
# Push to GitHub (Vercel auto-deploys)
git add .
git commit -m "Update Vercel config"
git push

# Or manually deploy
vercel --prod
```

### 3. Configure Environment Variables

**In Vercel Dashboard:**
- Go to Project → Settings → Environment Variables
- Add all variables from `server/production.env`
- Make sure `NODE_ENV=production`

**For Frontend Build:**
```bash
# Create client/.env.production
REACT_APP_API_URL=https://your-vercel-api-url.vercel.app/api
```

## ✅ Verification Checklist

- [ ] Frontend loads at `https://reporting.mangohickfire.com`
- [ ] `/login` route works (React Router)
- [ ] API calls work from frontend (check browser Network tab)
- [ ] Vercel API responds at `https://your-vercel-url.vercel.app/api/health`
- [ ] No 404 errors in browser console
- [ ] Icons load correctly (no 404s for `/icon-*.png`)

## 🔍 Troubleshooting

### If you see Vercel 404 for frontend routes:

1. **Check DNS**: Verify `reporting.mangohickfire.com` A record points to cPanel IP
2. **Check cPanel**: Ensure subdomain document root is correct
3. **Check .htaccess**: Verify `build-for-cpanel/.htaccess` is uploaded
4. **Clear Cache**: Hard refresh (Ctrl+F5) or clear browser cache

### If API calls fail:

1. **Check CORS**: Verify Vercel API allows requests from `reporting.mangohickfire.com`
2. **Check API URL**: Verify `REACT_APP_API_URL` is set correctly in frontend build
3. **Check Network Tab**: Look for CORS errors or 404s on API calls

## 📝 Current Configuration

Based on your setup:
- **Frontend Domain**: `reporting.mangohickfire.com` (should point to cPanel)
- **Backend**: Vercel (auto-assigned domain or custom)
- **Frontend API URL**: Should be set in `client/.env.production` before building

Make sure `reporting.mangohickfire.com` DNS A record points to your **cPanel server IP**, not Vercel!
