# Vercel 404 Troubleshooting

## Current Issue
Getting 404 NOT_FOUND on `/api/health` endpoint.

## Changes Made

1. **Updated vercel.json routing:**
   - Changed destination paths to include leading slash: `/api/index.js`
   - Added catch-all route for root paths

2. **Updated api/index.js:**
   - Explicitly imports and exports the Express app

## Testing Steps

### 1. Test Root Endpoint First
```bash
curl https://mvfd-reporting.vercel.app/
```
Should return API info JSON. If this works, the function is being called.

### 2. Test Health Endpoint
```bash
curl https://mvfd-reporting.vercel.app/api/health
```

### 3. Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Project
2. Click on "Functions" tab
3. Look for any error messages or logs from the function

## Alternative: Use Vercel's API Folder Structure

If the current setup doesn't work, we might need to use Vercel's zero-config API routes:

Create `api/health.js`:
```javascript
module.exports = async (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Mangohick Fire Reporting API'
  });
};
```

But this would require restructuring the entire API. Let's try the routing fix first.

## Debugging

If still getting 404, check:
1. **Vercel Function Logs** - Look for startup errors
2. **Build Logs** - Check if dependencies installed correctly
3. **Network Tab** - See the actual HTTP response
4. **Try root endpoint** - `/` should work if function is loaded

## Next Steps

After committing these changes:
1. Wait for deployment
2. Test root endpoint (`/`)
3. If root works but `/api/health` doesn't, it's a routing issue
4. If root also 404s, it's a function export issue
