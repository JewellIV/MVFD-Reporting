# Mangohick Fire Reporting System - Setup Guide

## 🌐 Domain Configuration

**Production Domain:** `reporting.mangohickfire.com`

This guide will help you set up the Mangohick Fire Reporting System with the correct domain configuration.

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **MySQL**: 8.0 or higher (hosted at sdb-86.hosting.stackcp.net)
- **Nginx**: Latest version
- **SSL Certificate**: Let's Encrypt (automated)

### Domain Setup
1. **DNS Configuration**: Point `reporting.mangohickfire.com` to your server IP
2. **SSL Certificate**: Will be automatically configured during deployment
3. **Firewall**: Open ports 80, 443, and 22

## 🚀 Quick Setup

### 1. Clone and Prepare
```bash
git clone https://github.com/mangohick-vfd/reporting-system.git
cd reporting-system
```

### 2. Configure Environment

**Server Environment** (`server/.env`):
```bash
# Copy the example file
cp server/env.example server/.env

# The database configuration is already set up with your MySQL credentials:
# DB_HOST=sdb-86.hosting.stackcp.net
# DB_NAME=Reporting-35313030ad32
# DB_USER=Reporting-35313030ad32
# DB_PASSWORD=T43$cK6Q!Mr$
```

**Client Environment** (`client/.env`):
```bash
# Copy the example file
cp client/env.example client/.env

# Edit with your values
nano client/.env
```

### 3. Database Setup

**MySQL Database Already Configured:**
- **Host**: sdb-86.hosting.stackcp.net
- **Database**: Reporting-35313030ad32
- **Username**: Reporting-35313030ad32
- **Password**: T43$cK6Q!Mr$

The database is already set up and ready to use. No additional database setup required.

### 4. Install Dependencies
```bash
# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### 5. Build Application
```bash
# Build the client
cd client
npm run build
cd ..
```

### 6. Configure Nginx

Create `/etc/nginx/sites-available/mangohick-reporting`:
```nginx
server {
    listen 80;
    server_name reporting.mangohickfire.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name reporting.mangohickfire.com;

    # SSL will be configured by certbot
    ssl_certificate /etc/letsencrypt/live/reporting.mangohickfire.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reporting.mangohickfire.com/privkey.pem;

    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mangohick-reporting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL Certificate
```bash
sudo certbot --nginx -d reporting.mangohickfire.com
```

### 8. Create Systemd Service

Create `/etc/systemd/system/mangohick-reporting.service`:
```ini
[Unit]
Description=Mangohick Fire Reporting System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mangohick-reporting
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mangohick-reporting
sudo systemctl start mangohick-reporting
```

## 🔧 Configuration Details

### Environment Variables

**Server (.env):**
```bash
NODE_ENV=production
PORT=5000
CLIENT_URL=https://reporting.mangohickfire.com

# Database - MySQL (Already configured)
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$

# Security
JWT_SECRET=your-super-secure-jwt-secret
CORS_ORIGIN=https://reporting.mangohickfire.com
```

**Client (.env):**
```bash
REACT_APP_API_URL=https://reporting.mangohickfire.com/api
REACT_APP_APP_NAME=Mangohick Fire Reporting
REACT_APP_DOMAIN=reporting.mangohickfire.com
REACT_APP_NEMSIS_VERSION=3.5
REACT_APP_AGENCY_ID=MANGOHICK-VFD-001
```

## 📱 Access Information

- **Web Application**: https://reporting.mangohickfire.com
- **API Endpoint**: https://reporting.mangohickfire.com/api
- **Health Check**: https://reporting.mangohickfire.com/api/health

## 🔒 Security Features

- **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- **Security Headers**: XSS protection, content type sniffing prevention
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configured for the specific domain
- **JWT Authentication**: Secure token-based authentication

## 📊 NEMSIS 3.5 Features

- **Compliance**: Full NEMSIS 3.5 compliance with validation
- **Virginia State**: Virginia-specific reporting requirements
- **Data Quality**: Comprehensive data quality scoring
- **Export**: XML/CSV export for state and federal submission
- **Validation**: Real-time validation with detailed error reporting

## 🛠️ Maintenance

### Logs
```bash
# Application logs
sudo journalctl -u mangohick-reporting -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
cd client && npm run build && cd ..
sudo systemctl restart mangohick-reporting
```

### Backups
```bash
# Database backup (from hosted MySQL)
mysqldump -h sdb-86.hosting.stackcp.net -u Reporting-35313030ad32 -p Reporting-35313030ad32 > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /var/www/mangohick-reporting
```

## 🆘 Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   sudo certbot renew --dry-run
   ```

2. **Database Connection Issues**
   ```bash
   # Test MySQL connection to hosted database
   mysql -h sdb-86.hosting.stackcp.net -u Reporting-35313030ad32 -p Reporting-35313030ad32
   
   # Check if the application can connect
   # Look for database connection errors in the application logs
   ```

3. **Application Not Starting**
   ```bash
   # Check service status
   sudo systemctl status mangohick-reporting
   
   # Check logs
   sudo journalctl -u mangohick-reporting --no-pager
   ```

4. **Nginx Issues**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Reload configuration
   sudo systemctl reload nginx
   ```

## 📞 Support

For technical support:
- **Email**: admin@mangohickfire.com
- **Documentation**: Check the README.md and DEPLOYMENT.md files
- **Issues**: Create an issue in the GitHub repository

---

**Your Mangohick Fire Reporting System is now ready at https://reporting.mangohickfire.com!**
