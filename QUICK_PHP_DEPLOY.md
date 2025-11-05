# Quick PHP Deployment - cPanel Only

## 🚀 3-Step Deployment

### Step 1: Build Frontend (2 min)
```powershell
.\build-for-cpanel.bat
```

### Step 2: Upload to cPanel (5 min)

1. **Upload Frontend** to `public_html/`:
   - All files from `build-for-cpanel/`
   - Make sure `.htaccess` is included

2. **Upload Backend** to `public_html/api/`:
   - Create `api/` directory
   - Upload all files from `api/` folder:
     - `api/config/`
     - `api/auth/`
     - `api/*.php`
     - `api/.htaccess`

3. **Create `.env` file** in `public_html/api/`:
   ```
   DB_HOST=sdb-86.hosting.stackcp.net
   DB_PORT=3306
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASS=your_database_password
   JWT_SECRET=your-long-random-secret-key-32-chars-minimum
   ```

4. **Set Permissions**:
   - Folders: 755
   - Files: 644

### Step 3: Test (1 min)

1. Visit: `https://yourdomain.com/api/health`
   - Should show: `{"status":"healthy","database":"connected"}`

2. Visit: `https://yourdomain.com`
   - Should show login page

3. Try logging in!

---

## ✅ That's It!

Your site now runs **100% on cPanel** - no separate backend needed!

---

## 📁 Final Structure

```
public_html/
├── index.html
├── static/
├── .htaccess
└── api/
    ├── .env
    ├── .htaccess
    ├── index.php
    └── [other PHP files]
```

---

## ❓ Troubleshooting

**API returns 500?**
- Check `.env` file exists and has correct credentials
- Check PHP error logs in cPanel

**Can't login?**
- Verify `JWT_SECRET` is set in `.env`
- Check API health endpoint works

**404 on API routes?**
- Verify `api/.htaccess` exists
- Check file permissions

See `CPANEL_PHP_DEPLOYMENT.md` for detailed guide.

