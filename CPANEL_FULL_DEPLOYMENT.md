# cPanel Full Deployment Guide

This guide will help you deploy the Mangohick Fire Reporting system to cPanel with both frontend and backend.

## Architecture Options

### Option 1: Static Frontend + Separate Backend (Recommended)
- **Frontend**: Static files on cPanel (public_html)
- **Backend**: Node.js server on Render.com, Railway.app, or your own VPS
- **Database**: MySQL on cPanel (or your existing database)

### Option 2: Full Stack on cPanel (If Node.js is supported)
- **Frontend**: Static files on cPanel
- **Backend**: Node.js application on cPanel (if your host supports it)
- **Database**: MySQL on cPanel

## Prerequisites

1. cPanel hosting account
2. MySQL database (already configured)
3. Node.js hosting for backend (Render.com, Railway.app, etc.) - if using Option 1
4. Git access to your repository

---

## Step 1: Build Frontend for cPanel

### On Your Local Machine:

1. **Open PowerShell or Command Prompt** in the project root

2. **Set API URL** (if backend is on different domain):
   ```powershell
   # Option 1: Backend on separate domain (e.g., Render.com)
   $env:REACT_APP_API_URL="https://your-backend.onrender.com/api"
   
   # Option 2: Backend on same domain (use relative path)
   # Don't set REACT_APP_API_URL - it will default to /api
   ```

3. **Run the build script**:
   ```powershell
   .\build-for-cpanel.bat
   ```

4. **Build output** will be in `build-for-cpanel/` directory

---

## Step 2: Deploy Frontend to cPanel

1. **Log into cPanel**

2. **Open File Manager**

3. **Navigate to your domain's public_html folder**
   - For main domain: `public_html/`
   - For subdomain: `public_html/subdomain/`

4. **Upload ALL files from `build-for-cpanel/`**
   - Select all files (including `.htaccess`)
   - Make sure to show hidden files to see `.htaccess`
   - Upload via File Manager or FTP

5. **Set file permissions**:
   - **Folders**: 755
   - **Files**: 644
   - **.htaccess**: 644

6. **Verify .htaccess is uploaded**
   - It should be in the root of public_html
   - If missing, create it from `build-for-cpanel/.htaccess`

---

## Step 3: Deploy Backend

### If using Option 1 (Separate Backend):

#### Option A: Deploy to Render.com (Free Tier Available)

1. **Create account** at https://render.com

2. **Create new Web Service**

3. **Connect your GitHub repository**

4. **Configure settings**:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

5. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your-secret-key-here
   DB_HOST=sdb-86.hosting.stackcp.net
   DB_NAME=your-database-name
   DB_USER=your-database-user
   DB_PASS=your-database-password
   DB_PORT=3306
   CLIENT_URL=https://yourdomain.com
   CORS_ORIGIN=https://yourdomain.com
   ```

6. **Deploy** and note the URL (e.g., `https://mvfd-backend.onrender.com`)

7. **Update frontend API URL**:
   - Rebuild frontend with: `REACT_APP_API_URL=https://mvfd-backend.onrender.com/api`
   - Re-upload to cPanel

#### Option B: Deploy to Railway.app

1. **Create account** at https://railway.app

2. **New Project** → **Deploy from GitHub**

3. **Select repository** and set root directory to `server`

4. **Add environment variables** (same as Render.com)

5. **Deploy** and get URL

#### Option C: Deploy to Your Own VPS

1. **SSH into your VPS**

2. **Clone repository**:
   ```bash
   git clone https://github.com/JewellIV/MVFD-Reporting.git
   cd MVFD-Reporting/server
   ```

3. **Install dependencies**:
   ```bash
   npm install --production
   ```

4. **Create .env file**:
   ```bash
   nano .env
   ```
   Add all environment variables (see above)

5. **Install PM2** (process manager):
   ```bash
   npm install -g pm2
   ```

6. **Start server with PM2**:
   ```bash
   pm2 start index.js --name mvfd-api
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx** (reverse proxy):
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### If using Option 2 (Backend on cPanel):

**Note**: This only works if your cPanel host supports Node.js applications.

1. **Check if Node.js is available**:
   - In cPanel, look for "Node.js" or "Node.js Selector"
   - If not available, use Option 1

2. **Create Node.js application**:
   - Node.js version: 18.x or 20.x
   - Application root: `server`
   - Application URL: `https://yourdomain.com/api` (or subdomain)

3. **Upload server files** via File Manager or Git

4. **Set environment variables** in cPanel Node.js app settings

5. **Install dependencies** and start app

---

## Step 4: Database Configuration

Your database is already configured at:
- **Host**: `sdb-86.hosting.stackcp.net`
- **Port**: `3306`

Make sure your backend environment variables match:
```
DB_HOST=sdb-86.hosting.stackcp.net
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASS=your-database-password
DB_PORT=3306
```

---

## Step 5: Testing

1. **Test Frontend**:
   - Visit `https://yourdomain.com`
   - Should see login page

2. **Test API Connection**:
   - Open browser console (F12)
   - Check for API errors
   - Try logging in

3. **Test Backend Health**:
   - Visit `https://your-backend-url.com/api/health`
   - Should return status 200

---

## Troubleshooting

### Frontend Issues

**404 errors on page refresh**:
- Check `.htaccess` is uploaded
- Verify `mod_rewrite` is enabled (contact hosting)
- Check file permissions (folders: 755, files: 644)

**API connection errors**:
- Verify API URL in frontend build
- Check CORS settings on backend
- Check backend is running

### Backend Issues

**Database connection errors**:
- Verify database credentials
- Check database host allows connections from backend IP
- Test connection with MySQL client

**Authentication errors**:
- Verify `JWT_SECRET` is set
- Check token is being sent in requests
- Verify backend CORS allows your domain

### Common Errors

**"Internal Server Error"**:
- Check backend logs
- Verify all environment variables are set
- Check database connection

**"Cannot connect to API"**:
- Verify backend URL is correct
- Check backend is running
- Test backend health endpoint

---

## Environment Variables Reference

### Frontend (.env in client/):
```
REACT_APP_API_URL=https://your-backend-url.com/api
# Or leave empty for relative path /api
```

### Backend (.env in server/):
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key-min-32-chars
DB_HOST=sdb-86.hosting.stackcp.net
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASS=your-database-password
DB_PORT=3306
CLIENT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

---

## Support

For issues:
1. Check backend logs
2. Check browser console for frontend errors
3. Verify all environment variables
4. Test database connection
5. Review this guide again

---

## Quick Deployment Checklist

- [ ] Frontend built with correct API URL
- [ ] Frontend files uploaded to cPanel
- [ ] .htaccess file uploaded and permissions set
- [ ] Backend deployed to hosting service
- [ ] Backend environment variables configured
- [ ] Database connection tested
- [ ] Frontend accessible at domain
- [ ] API endpoints responding
- [ ] Login functionality working
- [ ] All routes accessible

---

**Last Updated**: 2025-01-05

