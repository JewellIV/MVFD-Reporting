# cPanel PHP Deployment Guide

## Overview

This site now runs **100% on cPanel** with:
- **Frontend**: Static React files (public_html)
- **Backend**: PHP API (api/ directory)
- **Database**: MySQL (your existing database)

No separate backend hosting needed!

---

## Step 1: Build Frontend

```powershell
.\build-for-cpanel.bat
```

This creates static files in `build-for-cpanel/` directory.

---

## Step 2: Upload to cPanel

### 2.1 Upload Frontend Files

1. Log into cPanel
2. Open File Manager
3. Navigate to `public_html/`
4. Upload **ALL files** from `build-for-cpanel/` directory
5. Make sure `.htaccess` is uploaded (it starts with a dot)

### 2.2 Upload Backend Files

1. In File Manager, navigate to `public_html/`
2. Create `api/` directory (if it doesn't exist)
3. Upload **ALL files** from the `api/` directory in your project:
   - `api/config/`
   - `api/auth/`
   - `api/index.php`
   - `api/health.php`
   - `api/roster.php`
   - `api/nemsis.php`
   - `api/nfirs.php`
   - `api/neris.php`
   - `api/.htaccess`

### 2.3 Set File Permissions

- **Folders**: 755
- **Files**: 644
- **.htaccess files**: 644

---

## Step 3: Configure Environment Variables

### Option A: Create .env file (Recommended)

1. In File Manager, navigate to `public_html/api/`
2. Create a file named `.env`
3. Add your database credentials:

```env
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_database_password
JWT_SECRET=your-long-random-secret-key-minimum-32-characters
```

**Important**: Generate a secure JWT_SECRET:
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use an online generator
```

### Option B: Set in cPanel (Alternative)

Some hosts allow setting environment variables in cPanel. Check your hosting provider's documentation.

---

## Step 4: Test Installation

### 4.1 Test API Health

Visit: `https://yourdomain.com/api/health`

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "...",
  "service": "Mangohick Fire Reporting API"
}
```

### 4.2 Test Frontend

Visit: `https://yourdomain.com`

Should show the login page.

### 4.3 Test Login

1. Try logging in with existing credentials
2. Check browser console (F12) for any errors

---

## Step 5: Database Setup

Your database tables should already exist from the Node.js setup. If not, you may need to run migrations.

### Check Database Tables

The PHP backend expects these tables:
- `users` - User accounts
- `nemsis_records` - NEMSIS records (JSON stored in recordData column)
- `nfirs_records` - NFIRS records (JSON stored in recordData column)
- `neris_records` - NERIS records (JSON stored in recordData column)

If tables don't exist, you may need to create them or run the Sequelize migrations from the Node.js setup first.

---

## Troubleshooting

### API Returns 500 Error

1. Check PHP error logs in cPanel
2. Verify `.env` file exists in `api/` directory
3. Verify database credentials are correct
4. Check file permissions (644 for files, 755 for directories)

### "Database connection failed"

1. Verify database credentials in `.env`
2. Check database host allows connections
3. Test connection with phpMyAdmin

### "Authentication required" on all requests

1. Verify `JWT_SECRET` is set in `.env`
2. Check token is being sent in Authorization header
3. Verify token format: `Bearer <token>`

### Frontend can't connect to API

1. Check API health endpoint: `https://yourdomain.com/api/health`
2. Verify `api/` directory is in `public_html/api/`
3. Check `.htaccess` in `api/` directory is present
4. Verify CORS headers are being sent (check Network tab)

### 404 on API routes

1. Verify `api/.htaccess` exists
2. Check `mod_rewrite` is enabled (contact hosting)
3. Verify file permissions

---

## File Structure on cPanel

```
public_html/
├── index.html          (React app)
├── static/             (React build files)
├── .htaccess          (React Router config)
└── api/               (PHP backend)
    ├── .env           (Environment variables)
    ├── .htaccess      (PHP routing)
    ├── index.php      (API router)
    ├── health.php     (Health check)
    ├── config/        (Config files)
    │   ├── database.php
    │   ├── auth.php
    │   └── env.php
    ├── auth/          (Auth endpoints)
    │   ├── login.php
    │   ├── register.php
    │   └── me.php
    ├── roster.php
    ├── nemsis.php
    ├── nfirs.php
    └── neris.php
```

---

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Set proper file permissions** - 644 for files, 755 for directories
3. **Use strong JWT_SECRET** - Minimum 32 characters, random
4. **Keep PHP updated** - Check cPanel for PHP version updates
5. **Enable HTTPS** - Use SSL certificate (free from Let's Encrypt)

---

## Quick Checklist

- [ ] Frontend built and uploaded to `public_html/`
- [ ] `.htaccess` uploaded for React Router
- [ ] `api/` directory created in `public_html/`
- [ ] All PHP files uploaded to `api/`
- [ ] `.env` file created with database credentials
- [ ] `JWT_SECRET` set in `.env`
- [ ] File permissions set (644/755)
- [ ] API health check works (`/api/health`)
- [ ] Frontend loads (`/`)
- [ ] Login works

---

## Support

If you encounter issues:
1. Check PHP error logs in cPanel
2. Check browser console for frontend errors
3. Test API endpoints directly
4. Verify all files are uploaded correctly
5. Check file permissions

---

**Last Updated**: 2025-01-05

