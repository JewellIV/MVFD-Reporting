# Troubleshooting Internal Server Error on reporting.mangohickfire.com

## Quick Diagnostic Steps

### 1. Test if Server is Running

Visit: `https://reporting.mangohickfire.com/api/diagnostic`

This will show:
- If the server is running
- What environment variables are set
- What build files are found
- Error details if any

### 2. Check Server Logs

In cPanel:
1. Go to **Error Logs** (in cPanel dashboard)
2. Look for recent errors
3. Check for:
   - Database connection errors
   - Missing environment variables
   - Port conflicts
   - Module loading errors

### 3. Common Issues & Solutions

#### Issue: "Internal Server Error" on all routes

**Possible Causes:**
- Node.js server not running
- Missing environment variables (especially JWT_SECRET)
- Database connection failing
- Server crashing on startup

**Solutions:**

**A. If using cPanel Node.js Selector:**
1. Go to cPanel → **Node.js Selector**
2. Create a new application
3. Set:
   - Application root: `/home/username/reporting/server`
   - Application URL: `/reporting` (or your subdomain)
   - Application startup file: `index.js`
4. Add environment variables (see below)
5. Click "Run NPM install"
6. Click "Start App"

**B. If using SSH/manual start:**
1. SSH into your server
2. Navigate to server directory: `cd ~/reporting/server`
3. Check if `.env` file exists: `ls -la .env`
4. If missing, create it from `production.env`
5. Start server: `node index.js`
6. Check for errors in output

**C. If using reverse proxy (nginx/Apache):**
1. Make sure Node.js server is running on port 5000
2. Check proxy configuration in `.htaccess` or nginx config
3. Verify proxy_pass is correct

### 4. Required Environment Variables

Create `.env` file in `server/` directory with:

```bash
NODE_ENV=production
PORT=5000
SERVE_CLIENT=true

# Database
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$

# JWT (REQUIRED - server will crash without this)
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
JWT_EXPIRE=24h

# CORS
CORS_ORIGIN=https://reporting.mangohickfire.com
CLIENT_URL=https://reporting.mangohickfire.com
```

### 5. Check Build Files Location

The server looks for build files in these locations (in order):
1. `/build/` (root level)
2. `/client/build/` (client subdirectory)
3. `/build-for-cpanel/` (CPanel deployment)
4. `/public/` (public directory)
5. `/dist/` (alternative build directory)

Make sure your build files are in one of these locations.

### 6. Test Database Connection

If database connection fails, the server will still start but API calls may fail.

To skip database initialization (for testing):
```bash
DB_SKIP_INIT=true
```

### 7. Check File Permissions

In cPanel File Manager:
- Server files: 644
- Server folders: 755
- `.env` file: 600 (for security)

### 8. Verify Node.js Version

Your server needs Node.js 18+:
```bash
node --version
```

If using cPanel Node.js Selector, make sure you select Node.js 18 or higher.

### 9. Check Port Availability

The server uses port 5000 by default. If it's in use:
1. Change PORT in `.env` file
2. Update your reverse proxy configuration
3. Restart the server

### 10. Minimal Test

Create a simple test file `server/test.js`:
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Server is working' });
});

app.listen(5000, () => {
  console.log('Test server running on port 5000');
});
```

Run: `node test.js`
Visit: `http://localhost:5000`

If this works, the issue is with your main server configuration.

## Still Having Issues?

1. Check `/api/diagnostic` endpoint response
2. Review server error logs
3. Verify all environment variables are set
4. Check if Node.js is actually running
5. Verify database credentials are correct


