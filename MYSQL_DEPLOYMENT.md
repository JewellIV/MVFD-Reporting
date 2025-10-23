# MySQL Deployment Guide for Mangohick Fire Reporting System

## 🚀 Quick Start

### 1. **Install Dependencies**

```bash
cd server
npm install
```

### 2. **Setup MySQL Database**

#### Option A: Local MySQL
```bash
# Install MySQL (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL
sudo mysql_secure_installation

# Create database
mysql -u root -p
CREATE DATABASE mangohick_fire;
CREATE USER 'mangohick_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON mangohick_fire.* TO 'mangohick_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Option B: MySQL on cPanel/Shared Hosting
1. Go to cPanel → MySQL Databases
2. Create database: `mangohick_fire`
3. Create user and assign to database
4. Note the credentials

### 3. **Configure Environment**

Edit `server/.env` with your MySQL credentials:

```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=mangohick_fire
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
```

### 4. **Setup Database Tables**

```bash
cd server
node setup-database.js
```

### 5. **Start Server**

```bash
npm start
```

### 6. **Test the System**

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mangohick-vfd.org","password":"admin123"}'
```

## 🌐 **Live Site Deployment**

### For cPanel/Shared Hosting:

1. **Upload Files:**
   - Upload `server` folder to your hosting account
   - Upload `client` folder to `public_html`

2. **Create MySQL Database:**
   - Go to cPanel → MySQL Databases
   - Create database: `mangohick_fire`
   - Create user and assign to database

3. **Configure Environment:**
   - Update `.env` with your MySQL credentials
   - Update `CORS_ORIGIN` to your domain

4. **Install Dependencies:**
   ```bash
   cd server
   npm install
   ```

5. **Setup Database:**
   ```bash
   node setup-database.js
   ```

6. **Start Server:**
   ```bash
   npm start
   ```

### For VPS/Dedicated Server:

1. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install MySQL:**
   ```bash
   sudo apt-get update
   sudo apt-get install mysql-server
   sudo mysql_secure_installation
   ```

3. **Create Database:**
   ```sql
   CREATE DATABASE mangohick_fire;
   CREATE USER 'mangohick_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON mangohick_fire.* TO 'mangohick_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Deploy Application:**
   ```bash
   git clone your-repo
   cd mangohick-fire-reporting
   cd server
   npm install
   node setup-database.js
   npm start
   ```

5. **Setup PM2 (Process Manager):**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name "mangohick-server"
   pm2 startup
   pm2 save
   ```

## 🔧 **Troubleshooting**

### Common Issues:

1. **Database Connection Error:**
   - Check MySQL service is running
   - Verify credentials in `.env`
   - Ensure database exists

2. **Permission Denied:**
   - Check file permissions
   - Ensure upload directory is writable

3. **CORS Issues:**
   - Update `CORS_ORIGIN` in `.env`
   - Check server is running on correct port

### Test Commands:

```bash
# Check MySQL connection
mysql -u your_username -p -h localhost mangohick_fire

# Check if tables exist
mysql -u your_username -p -h localhost mangohick_fire -e "SHOW TABLES;"

# Test API
curl http://localhost:5000/api/health
```

## 📱 **Access the System**

1. **Web Interface:** `http://yourdomain.com`
2. **API Endpoint:** `http://yourdomain.com:5000/api`
3. **Login Credentials:**
   - Username: `admin`
   - Email: `admin@mangohick-vfd.org`
   - Password: `admin123`

## 🔒 **Security Notes**

- Change default admin password after first login
- Use strong MySQL passwords
- Enable SSL/HTTPS for production
- Regular database backups
- Keep dependencies updated

## 📞 **Support**

For issues or questions:
- Check server logs: `npm start`
- Verify database connection
- Test API endpoints
- Check environment variables

---

**The system is now ready for MySQL deployment!**
