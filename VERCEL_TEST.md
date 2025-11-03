# Testing Your Vercel Deployment

## ✅ Build Status
Your Vercel build completed successfully! Now let's test if it's working correctly.

## 🔍 Testing Steps

### 1. Test the Root Endpoint
Visit your Vercel deployment URL:
```
https://your-app.vercel.app/
```

**Expected Response:**
```json
{
  "service": "Mangohick Fire Reporting API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health",
    "auth": "/api/auth",
    "nemsis": "/api/nemsis",
    "nfirs": "/api/nfirs",
    "neris": "/api/neris"
  },
  "message": "This is the API server. The frontend should be served separately."
}
```

### 2. Test the Health Endpoint
```
https://your-app.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "service": "Mangohick Fire Reporting API"
}
```

### 3. Check Function Logs
In Vercel Dashboard:
1. Go to your project
2. Click on **Deployments**
3. Click on the latest deployment
4. Click on **Functions** tab
5. Check for any error messages

**Look for:**
- ✅ "📦 Serverless environment detected - database connections will be made on-demand"
- ✅ "✅ All API routes loaded successfully"
- ⚠️ Any database connection errors (these are expected if DB is not accessible)

### 4. Test Database Connection (Optional)
If you have database credentials configured, test an endpoint that requires DB:
```
https://your-app.vercel.app/api/auth/login
```

**Expected:** Either a successful response or a database connection error (not a crash).

## 🐛 Troubleshooting

### If You Get 500 Error:

1. **Check Function Logs** (in Vercel Dashboard):
   - Look for specific error messages
   - Database connection errors are expected if hostname is not accessible

2. **Verify Environment Variables**:
   - Go to **Settings** → **Environment Variables**
   - Ensure all required variables are set (especially database credentials)

3. **Test Locally with Vercel CLI**:
   ```bash
   cd server
   vercel dev
   ```
   Then visit `http://localhost:3000/api/health`

### Common Issues:

1. **Database Not Accessible from Vercel**:
   - Solution: Database hostname must be publicly accessible
   - Update MySQL user permissions in cPanel to allow connections from `%` (any IP)
   - Or use a database proxy service (PlanetScale, Railway, etc.)

2. **Missing Environment Variables**:
   - Ensure all variables are set in Vercel Dashboard
   - Check that variable names match exactly (case-sensitive)

3. **Function Timeout**:
   - Default timeout is 10 seconds (free plan) or 60 seconds (Pro)
   - Database connections on first request might be slow
   - Consider using `DB_SKIP_INIT=true` to skip startup connection

## ✅ Success Indicators

You'll know it's working if:
- ✅ Root endpoint (`/`) returns API info JSON
- ✅ Health endpoint (`/api/health`) returns status OK
- ✅ No crashes in function logs
- ✅ Functions tab shows successful invocations

## 🔗 Next Steps

Once the API is working:
1. Update your frontend `REACT_APP_API_URL` to point to your Vercel URL
2. Test authentication endpoints
3. Configure CORS if needed (update `CLIENT_URL` env var)

