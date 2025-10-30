# cPanel Web Host Deployment Guide
## Mangohick Fire Reporting System

This guide covers deploying your fire reporting system on a cPanel web host (like StackCP, GoDaddy, HostGator, etc.).

## 📋 Prerequisites

- cPanel access to your web hosting account
- MySQL database (already configured: `sdb-86.hosting.stackcp.net`)
- Node.js version 18+ (check if your host supports it in cPanel → Select PHP Version → Extensions)
- SSH access (if available) or File Manager access

---

## 🎯 Your Current Setup

Based on your configuration files:
- **Domain**: reporting.mangohickfire.com
- **Database Host**: sdb-86.hosting.stackcp.net
- **Database**: Reporting-35313030ad32
- **Database User**: Reporting-35313030ad32

---

## 🚀 Deployment Options

cPanel hosting has limitations, so here are your best options:

### **Option 1: Hybrid Setup (Recommended)**
**Server runs separately, files served via cPanel**
- Deploy frontend to cPanel public_html
- Host Node.js server on VPS, AWS, or render.com
- Point API calls from cPanel to external server

### **Option 2: All-in-One cPanel (if Node.js supported)**
- Everything on cPanel
- Uses Node.js version manager in cPanel

### **Option 3: Static Site + External API**
- Frontend deployed as static site to cPanel
- API hosted separately (Render, Railway, Heroku)

---

## 🎬 **Option 1: Hybrid Deployment (Recommended)**

This is best for your current setup with separate database hosting.

### **Part A: Deploy Frontend to cPanel**

#### Step 1: Build the React App Locally

On your computer, build the production version:

```bash
# Navigate to your project
cd MVFD-Reporting

# Build the client
cd client
npm install
npm run build
```

This creates a `build` folder in `client/` with all static files.

#### Step 2: Upload to cPanel

1. **Log into cPanel**
   - Go to: https://yourdomain.com:2083 (or your host’s cPanel URL)
   - Login with your credentials

2. **Open File Manager**
   - Navigate to `public_html` (or your domain folder)

3. **Upload Build Files**
   - Upload everything from `client/build/` to `public_html/`
   - Or create a subdomain like `app.yourdomain.com` and upload there

4. **Set Permissions**
   - Set folders to 755
   - Set files to 644

#### Step 3: Update .htaccess

Create `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  
  # Security headers
  <IfModule mod_headers.c>
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
  </IfModule>
</IfModule>
```

#### Step 4: Update API URL

In the uploaded build, edit `index.html` or use environment variables:

Change in `client/production.env` before building:
```bash
REACT_APP_API_URL=https://your-api-server.com/api
```

---

### **Part B: Deploy Backend API to External Server**

Your backend needs to run continuously. Best options:

#### **Option B1: Render.com (Free tier available)**

1. **Create Account**
   - Go to https://render.com
   - Sign up for free account

2. **Create Web Service**
   - New → Web Service
   - Connect your GitHub repo
   - Select repository

3. **Configure Build**
   ```
   Name: mangohick-api
   Root Directory: server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Add Environment Variables**
   
   Copy from `server/production.env`:
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=sdb-86.hosting.stackcp.net
   DB_PORT=3306
   DB_NAME=Reporting-35313030ad32
   DB_USER=Reporting-35313030ad32
   DB_PASSWORD=T43$cK6Q!Mr$
   JWT_SECRET=MVFD2024SecureJWTSecretKeyForProductionUseOnly32+
   JWT_EXPIRE=24h
   ENCRYPTION_KEY=MVFD2024EncryptionKey32C
   CORS_ORIGIN=https://reporting.mangohickfire.com
   ```

5. **Deploy**
   - Render builds and deploys automatically
   - Get URL: https://your-app.onrender.com

6. **Update Frontend**
   - In cPanel, update API URL to point to Render URL

#### **Option B2: Railway.app (Pay-as-you-go)**

1. **Create Account**: https://railway.app
2. **New Project** → Deploy from GitHub
3. **Add MySQL Database** (or use your existing MySQL host)
4. **Set Environment Variables**
5. **Deploy** - Similar to Render but more flexible

#### **Option B3: AWS/GCP/Azure**

If you have cloud credits, host on a VM:
- AWS EC2, Google Compute Engine, or Azure VM
- Follow your existing deployment docs
- Run with PM2 for process management

---

## 🎬 **Option 2: All-in-One cPanel (Advanced)**

Only if your cPanel host supports Node.js applications.

### Check Node.js Support

1. In cPanel, look for "Setup Node.js App" or "Node.js Selector"
2. If not available, contact support

### Deployment Steps

1. **Create Node.js App in cPanel**
   ```
   Application Root: ~/nodeapp
   Application URL: reporting.mangohickfire.com
   Node.js Version: 18
   ```

2. **Upload Server Files**
   - Via SSH or File Manager, upload everything to `~/nodeapp/`

3. **Install Dependencies**
   ```bash
   cd ~/nodeapp/server
   npm install --production
   ```

4. **Configure Environment**
   - Create `server/.env` with your credentials
   - Or set via cPanel environment variables

5. **Restart Application**
   - Use cPanel Node.js app interface

---

## 🎬 **Option 3: Static Site + External API (Simplest)**

Frontend only on cPanel, backend elsewhere.

### Steps

1. **Follow Part A** from Option 1 (build and upload to cPanel)

2. **Deploy Backend** to:
   - Render.com (free tier)
   - Railway.app (pay-as-you-go)
   - Heroku (if available)
   - Your own VPS

3. **Update API URL** in frontend to point to backend

---

## 📊 Database Configuration

Your MySQL is already set up at:
```
Host: sdb-86.hosting.stackcp.net
Port: 3306
Database: Reporting-35313030ad32
User: Reporting-35313030ad32
Password: T43$cK6Q!Mr$
```

**No changes needed** - your backend will connect to it.

---

## 🔐 Security Checklist

- [ ] Change default passwords in production
- [ ] Enable HTTPS on your cPanel domain
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Set strong ENCRYPTION_KEY
- [ ] Update CORS_ORIGIN to your actual domain
- [ ] Hide `.env` files from public access
- [ ] Use firewall rules if available

---

## 🧪 Testing

After deployment:

1. **Test Frontend**
   ```bash
   curl https://reporting.mangohickfire.com
   ```

2. **Test Backend**
   ```bash
   curl https://your-api-url.com/api/health
   ```

3. **Test Login**
   - Visit your site
   - Try logging in

4. **Test NERIS Endpoint**
   ```bash
   curl https://your-api-url.com/api/neris/incident-types
   ```

---

## 📁 File Structure on cPanel

For Option 1 (Hybrid Setup):

```
home/username/
├── public_html/                    (Frontend - React build)
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   ├── manifest.json
│   ├── offline.html
│   └── .htaccess
│
└── ~/external-api/                 (Backend - if using cPanel Node.js)
    ├── server/
    │   ├── index.js
    │   ├── routes/
    │   ├── models/
    │   ├── services/
    │   └── .env
    └── package.json
```

---

## 🚨 Troubleshooting

### Frontend Not Loading

1. Check `.htaccess` is in place
2. Verify file permissions (755 for folders, 644 for files)
3. Ensure `index.html` exists in root
4. Check browser console for errors

### API Connection Failed

1. Verify CORS settings on backend
2. Check API URL in frontend
3. Test backend health endpoint
4. Review network tab in browser dev tools

### Database Connection Issues

1. Verify MySQL credentials
2. Check firewall rules allow connection
3. Confirm database host is accessible
4. Test connection with MySQL client

### Build Errors

1. Clean and rebuild:
   ```bash
   cd client
   rm -rf node_modules build
   npm install
   npm run build
   ```

---

## 📞 Quick Reference

### Build Frontend
```bash
cd client
npm install
npm run build
```

### Upload to cPanel
- Use File Manager or FTP client
- Upload contents of `client/build/` to `public_html/`

### Test Backend
```bash
curl https://your-api-url/api/health
```

### View Logs (if on Render/Railway)
- Check platform dashboard for logs

---

## ✅ Recommended Setup for Your Situation

**Recommended**: **Option 1 (Hybrid)**

Why?
- Your database is already on StackCP
- cPanel for frontend (static hosting)
- Backend on Render.com or Railway.app
- Simple to manage and update
- Free tiers available

**Step Summary**:
1. Build frontend locally
2. Upload to cPanel public_html
3. Deploy backend to Render.com
4. Update API URL in frontend
5. Test everything

---

## 🎉 Next Steps

1. Choose your deployment option
2. Follow the steps for that option
3. Test all functionality
4. Set up monitoring
5. Configure backups

---

**Need help?** Check your existing documentation:
- `DEPLOYMENT.md` - General deployment
- `MYSQL_DEPLOYMENT.md` - Database setup
- `DEPLOY_TO_PRODUCTION.md` - Production config

