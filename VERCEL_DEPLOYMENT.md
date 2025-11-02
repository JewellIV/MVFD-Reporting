# Vercel Deployment Guide

## Overview
This guide explains how to deploy the Mangohick Fire Reporting API to Vercel serverless functions.

## Configuration

### 1. Vercel Configuration (`vercel.json`)
The project includes a `vercel.json` file that configures:
- Serverless function handler from `server/index.js`
- Route mapping: `/api/*` → `server/index.js`
- Environment variables

### 2. Environment Variables
**IMPORTANT**: Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database Configuration
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=MVFDDB-35313030a78c
DB_USER=MVFDDB-35313030a78c
DB_PASSWORD=Mango2025

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
JWT_EXPIRE=24h

# Server Configuration
NODE_ENV=production
CLIENT_URL=https://reporting.mangohickfire.com

# Optional: Skip DB initialization on cold start
DB_SKIP_INIT=false
```

### 3. Database Connection Issues

**Common Problem**: The database hostname `sdb-86.hosting.stackcp.net` might not be accessible from Vercel's servers.

**Solutions**:
1. **Check Database Permissions**: 
   - In cPanel → MySQL Databases
   - Ensure the user has permission to connect from external IPs
   - Use `%` as the host or whitelist Vercel IPs

2. **Use a Database Proxy**:
   - Consider using a connection pooler (e.g., PlanetScale, Railway, Supabase)
   - These services provide publicly accessible database endpoints

3. **Network Configuration**:
   - Check firewall rules on your hosting provider
   - Ensure port 3306 is open to external connections
   - Some hosting providers block external MySQL connections by default

### 4. Deployment Steps

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Or use GitHub Integration**:
   - Connect your repository in Vercel Dashboard
   - Vercel will automatically deploy on every push

### 5. Function Configuration

The server has been configured to:
- ✅ Export Express app as serverless handler (not call `app.listen()`)
- ✅ Skip database connection test at module load time
- ✅ Handle errors gracefully without crashing
- ✅ Support both serverless (Vercel) and traditional deployments

### 6. Debugging

**Check Vercel Logs**:
```bash
vercel logs
```

**Common Errors**:

1. **FUNCTION_INVOCATION_FAILED**:
   - Check database connectivity
   - Verify environment variables are set
   - Check Vercel function logs

2. **Database Connection Timeout**:
   - Database hostname not accessible from Vercel
   - Firewall blocking connections
   - Incorrect database credentials

3. **Module Not Found**:
   - Ensure `server/node_modules` has all dependencies
   - Run `npm install` in `server/` directory before deploying

### 7. Testing Locally

Test serverless function locally:
```bash
vercel dev
```

This simulates the Vercel environment locally.

### 8. Alternative: Deploy Backend Separately

If Vercel serverless functions don't work well with your database setup, consider:
- Deploying backend to **Render.com** (see `RENDER_DEPLOYMENT_GUIDE.md`)
- Using a traditional VPS/cloud server
- Using Railway or Fly.io for better database connectivity

### 9. Cold Start Optimization

To reduce cold start times:
- Set `DB_SKIP_INIT=true` to skip database connection on startup
- Connections will be made on-demand when routes are called
- Consider using a connection pooler

### 10. CORS Configuration

Ensure `CLIENT_URL` is set correctly:
```bash
CLIENT_URL=https://reporting.mangohickfire.com
```

This allows your frontend to make API requests to the Vercel deployment.

