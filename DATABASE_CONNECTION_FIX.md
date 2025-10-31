# Database Connection Fix for cPanel

## 🔴 Current Issue
The database hostname `sdb-86.hosting.stackcp.net` cannot be resolved (ENOTFOUND error).

## 🔧 How to Fix

### Option 1: Use `localhost` (Most Common for cPanel)

If your Node.js app and MySQL database are on the **same cPanel server**, use `localhost`:

1. Edit `server/production.env`:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$
```

2. Restart your Node.js application

### Option 2: Find the Correct Hostname in cPanel

1. **Login to cPanel**
2. Go to **MySQL Databases** (or **Databases** → **MySQL Databases**)
3. Find your database: `Reporting-35313030ad32`
4. Look for the **"Current Users"** section
5. You'll see the hostname format - it might be:
   - `localhost` (most common)
   - `%` (allows from anywhere)
   - A different internal hostname like `mysql.yourhosting.com`
   - An IP address

6. If you see the user listed with hostname, note it down
7. Update `server/production.env` with that hostname

### Option 3: Use the Database Server IP

If you have the MySQL server IP address, you can use that instead:

```bash
DB_HOST=123.45.67.89  # Replace with actual IP
DB_PORT=3306
```

### Option 4: Check Remote MySQL Access

1. In cPanel, go to **Remote MySQL**
2. Check if your server's IP is allowed
3. If not, add it to the allowed hosts

### Option 5: Use Connection URL Format

You can also use a connection URL in `server/production.env`:

```bash
# Remove DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# Add this instead:
DATABASE_URL=mysql://Reporting-35313030ad32:T43$cK6Q!Mr$@localhost:3306/Reporting-35313030ad32
```

## ✅ Test the Fix

After updating, restart your Node.js server and check:

```bash
# Should return healthy status
curl https://reporting.mangohickfire.com/api/health
```

Or visit: `https://reporting.mangohickfire.com/api/health`

The database check should show:
```json
{
  "database": {
    "status": "healthy",
    "message": "Database connected"
  }
}
```

## 🔍 Debug Steps

If it still doesn't work:

1. **Check server logs** - The updated code will show helpful error messages
2. **Test MySQL connection from terminal** (if you have SSH):
   ```bash
   mysql -h localhost -u Reporting-35313030ad32 -p Reporting-35313030ad32
   ```
3. **Verify credentials** - Double-check username, password, and database name in cPanel
4. **Check firewall** - Ensure port 3306 is open (if using remote MySQL)

## 📝 Quick Reference

**Most likely fix for StackCP/cPanel hosting:**
```bash
DB_HOST=localhost
```

Save and restart your Node.js application.

