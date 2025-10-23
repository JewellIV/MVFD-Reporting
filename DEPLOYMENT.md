# Mangohick Fire Reporting System - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the Mangohick Fire Reporting System to production environments with full compliance and security.

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **MongoDB**: 5.0 or higher (Atlas recommended for production)
- **Memory**: Minimum 4GB RAM, 8GB recommended
- **Storage**: Minimum 100GB SSD, 500GB recommended
- **CPU**: 2+ cores, 4+ cores recommended

### Cloud Platform Requirements
- **AWS GovCloud** (recommended for government compliance)
- **Azure Government**
- **Google Cloud Platform** (with government compliance features)

### External Services
- **MongoDB Atlas** (or self-hosted MongoDB)
- **Google Cloud Platform** (for Google integration)
- **Virginia VPHIB API** credentials
- **Virginia VDFP API** credentials
- **CAD System** integration credentials

## 🔧 Environment Configuration

### 1. Server Environment Variables

Create a `.env` file in the server directory:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mangohick-fire?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRE=24h

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Virginia State APIs
VPHIB_API_URL=https://vphib.vdh.virginia.gov/api
VPHIB_API_KEY=your-vphib-api-key
VDFP_API_URL=https://vdfp.virginia.gov/api
VDFP_API_KEY=your-vdfp-api-key

# Google Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback

# CAD Integration
CAD_SYSTEM_TYPE=centralsquare
CAD_API_URL=https://your-cad-system.com/api
CAD_API_KEY=your-cad-api-key

# File Upload
UPLOAD_PATH=/var/uploads
MAX_FILE_SIZE=10485760

# Email/SMS (optional)
SENDGRID_API_KEY=your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Backup
BACKUP_DIR=/var/backups
BACKUP_RETENTION_DAYS=30

# Monitoring
HEALTH_CHECK_INTERVAL=300000
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# PWA
PWA_ENABLED=true
PWA_CACHE_STRATEGY=networkFirst
```

### 2. Client Environment Variables

Create a `.env` file in the client directory:

```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_PWA_ENABLED=true
REACT_APP_OFFLINE_ENABLED=true
REACT_APP_VOICE_ENABLED=true
REACT_APP_AI_ENABLED=true
```

## 🐳 Docker Deployment

### 1. Create Dockerfile

**Server Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY server/ .

# Create upload directory
RUN mkdir -p /var/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start server
CMD ["npm", "start"]
```

**Client Dockerfile:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies
COPY client/package*.json ./
RUN npm ci

# Copy source code
COPY client/ .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: mangohick-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your-mongodb-password
      MONGO_INITDB_DATABASE: mangohick-fire
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    ports:
      - "27017:27017"
    networks:
      - mangohick-network

  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: mangohick-server
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:your-mongodb-password@mongodb:27017/mangohick-fire?authSource=admin
    volumes:
      - uploads_data:/var/uploads
      - backups_data:/var/backups
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    networks:
      - mangohick-network

  client:
    build:
      context: .
      dockerfile: client/Dockerfile
    container_name: mangohick-client
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - mangohick-network

  nginx:
    image: nginx:alpine
    container_name: mangohick-nginx
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "443:443"
      - "80:80"
    depends_on:
      - client
      - server
    networks:
      - mangohick-network

volumes:
  mongodb_data:
  uploads_data:
  backups_data:

networks:
  mangohick-network:
    driver: bridge
```

## ☁️ Cloud Deployment

### AWS GovCloud Deployment

1. **Create EC2 Instance:**
   ```bash
   # Launch t3.medium or larger instance
   # Use Amazon Linux 2 AMI
   # Configure security groups for ports 80, 443, 22
   ```

2. **Install Dependencies:**
   ```bash
   sudo yum update -y
   sudo yum install -y nodejs npm git
   sudo yum install -y nginx
   ```

3. **Deploy Application:**
   ```bash
   git clone https://github.com/mangohick-vfd/reporting-system.git
   cd reporting-system
   npm run install-all
   npm run build
   ```

4. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;

       location / {
           root /var/www/html;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Setup SSL Certificate:**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

6. **Configure Systemd Services:**
   ```bash
   # Create /etc/systemd/system/mangohick-server.service
   [Unit]
   Description=Mangohick Fire Reporting Server
   After=network.target

   [Service]
   Type=simple
   User=ec2-user
   WorkingDirectory=/home/ec2-user/reporting-system
   ExecStart=/usr/bin/node server/index.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

### Azure Government Deployment

1. **Create App Service:**
   - Use Node.js 18 runtime
   - Configure custom domain
   - Enable HTTPS
   - Configure application settings

2. **Create Cosmos DB:**
   - Use MongoDB API
   - Configure firewall rules
   - Enable backup

3. **Configure Application Insights:**
   - Enable monitoring
   - Configure alerts
   - Setup dashboards

## 🔒 Security Configuration

### 1. SSL/TLS Configuration

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 2. Security Headers

```javascript
// In server/index.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 3. Database Security

```javascript
// MongoDB connection with security options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true,
  authSource: 'admin',
  retryWrites: true,
  w: 'majority'
});
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheckService.runAllChecks();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 2. Logging Configuration

```javascript
// Winston logger configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 3. Performance Monitoring

```javascript
// Response time middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration
    });
  });
  next();
});
```

## 🔄 Backup & Recovery

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh

# Create backup
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
mongodump --uri="$MONGODB_URI" --out="/var/backups/$BACKUP_NAME"

# Compress backup
tar -czf "/var/backups/$BACKUP_NAME.tar.gz" -C "/var/backups" "$BACKUP_NAME"
rm -rf "/var/backups/$BACKUP_NAME"

# Upload to S3
aws s3 cp "/var/backups/$BACKUP_NAME.tar.gz" s3://your-backup-bucket/

# Cleanup old backups
find /var/backups -name "backup-*.tar.gz" -mtime +7 -delete
```

### 2. Cron Job

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database configured and secured
- [ ] External API credentials obtained
- [ ] Security headers configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Deployment
- [ ] Code deployed to production
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Health checks passing
- [ ] Performance tests passed
- [ ] Security scan completed

### Post-Deployment
- [ ] Monitoring alerts configured
- [ ] Backup verification
- [ ] User acceptance testing
- [ ] Documentation updated
- [ ] Team training completed

## 🔧 Maintenance

### Regular Tasks
- **Daily**: Monitor system health and logs
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and update compliance documentation

### Emergency Procedures
- **System Down**: Check health endpoints, restart services
- **Database Issues**: Check MongoDB status, restore from backup
- **API Failures**: Check external service status, implement fallbacks
- **Security Incident**: Follow incident response plan

## 📞 Support

For deployment support and issues:
- **Technical Support**: support@mangohick-vfd.org
- **Emergency Support**: 24/7 support available
- **Documentation**: https://docs.mangohick-vfd.org
- **Issue Tracker**: https://github.com/mangohick-vfd/reporting-system/issues

---

**This deployment guide ensures a secure, compliant, and scalable production environment for the Mangohick Fire Reporting System.**