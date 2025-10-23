#!/bin/bash

# Mangohick Fire Reporting System - Deployment Script
# Domain: reporting.mangohickfire.com

set -e

echo "🚒 Deploying Mangohick Fire Reporting System to reporting.mangohickfire.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="reporting.mangohickfire.com"
APP_DIR="/var/www/mangohick-reporting"
NGINX_CONFIG="/etc/nginx/sites-available/mangohick-reporting"
SERVICE_NAME="mangohick-reporting"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v nginx &> /dev/null; then
        missing_deps+=("nginx")
    fi
    
    if ! command -v certbot &> /dev/null; then
        missing_deps+=("certbot")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install missing dependencies and run the script again"
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Create application directory
setup_directories() {
    print_status "Setting up directories..."
    
    sudo mkdir -p $APP_DIR
    sudo mkdir -p /var/log/mangohick-reporting
    sudo mkdir -p /var/backups/mangohick-reporting
    sudo mkdir -p /var/uploads/mangohick-reporting
    
    # Set proper permissions
    sudo chown -R $USER:$USER $APP_DIR
    sudo chown -R $USER:$USER /var/log/mangohick-reporting
    sudo chown -R $USER:$USER /var/backups/mangohick-reporting
    sudo chown -R $USER:$USER /var/uploads/mangohick-reporting
    
    print_success "Directories created"
}

# Install application dependencies
install_dependencies() {
    print_status "Installing application dependencies..."
    
    cd $APP_DIR
    
    # Install server dependencies
    if [ -f "server/package.json" ]; then
        cd server
        npm ci --production
        cd ..
    fi
    
    # Install client dependencies and build
    if [ -f "client/package.json" ]; then
        cd client
        npm ci
        npm run build
        cd ..
    fi
    
    print_success "Dependencies installed and application built"
}

# Configure environment variables
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Create server environment file
    cat > $APP_DIR/server/.env << EOF
# Mangohick Fire Reporting System - Production Configuration
NODE_ENV=production
PORT=5000
CLIENT_URL=https://$DOMAIN

# Database Configuration - MySQL (Hosted)
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43\$cK6Q!Mr\$

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=24h

# Encryption
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Security
CORS_ORIGIN=https://$DOMAIN
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_PATH=/var/uploads/mangohick-reporting
MAX_FILE_SIZE=10485760

# Backup
BACKUP_DIR=/var/backups/mangohick-reporting
BACKUP_RETENTION_DAYS=30

# Monitoring
HEALTH_CHECK_INTERVAL=300000
LOG_LEVEL=info

# PWA
PWA_ENABLED=true
PWA_CACHE_STRATEGY=networkFirst
EOF

    # Create client environment file
    cat > $APP_DIR/client/.env << EOF
# Mangohick Fire Reporting System - Client Configuration
REACT_APP_API_URL=https://$DOMAIN/api
REACT_APP_APP_NAME=Mangohick Fire Reporting
REACT_APP_APP_VERSION=1.0.0
REACT_APP_DOMAIN=$DOMAIN
REACT_APP_PWA_ENABLED=true
REACT_APP_OFFLINE_ENABLED=true
REACT_APP_VOICE_ENABLED=true
REACT_APP_AI_ENABLED=true
REACT_APP_NEMSIS_VERSION=3.5
REACT_APP_AGENCY_ID=MANGOHICK-VFD-001
REACT_APP_STATE=VA
REACT_APP_COUNTY=Hanover
EOF

    print_success "Environment configuration created"
}

# Configure Nginx
setup_nginx() {
    print_status "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee $NGINX_CONFIG > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client max body size
    client_max_body_size 10M;

    # API routes
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        root /var/www/html;
    }

    # Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        root /var/www/html;
    }

    # Main application
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

    # Enable the site
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_success "Nginx configured"
}

# Setup SSL certificate
setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@mangohickfire.com
    
    print_success "SSL certificate configured"
}

# Create systemd service
setup_service() {
    print_status "Creating systemd service..."
    
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Mangohick Fire Reporting System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    
    print_success "Systemd service created"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    sudo systemctl start $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME --no-pager
    
    print_success "Services started"
}

# Main deployment function
main() {
    print_status "Starting deployment of Mangohick Fire Reporting System"
    print_status "Domain: $DOMAIN"
    print_status "Application Directory: $APP_DIR"
    
    check_dependencies
    setup_directories
    install_dependencies
    setup_environment
    setup_nginx
    setup_ssl
    setup_service
    start_services
    
    print_success "Deployment completed successfully!"
    print_status "Your application is now available at: https://$DOMAIN"
    print_status "API endpoint: https://$DOMAIN/api"
    print_status "Health check: https://$DOMAIN/api/health"
    
    print_warning "Don't forget to:"
    print_warning "1. Update database credentials in $APP_DIR/server/.env"
    print_warning "2. Configure Google API keys if needed"
    print_warning "3. Set up regular backups"
    print_warning "4. Monitor application logs: journalctl -u $SERVICE_NAME -f"
}

# Run main function
main "$@"
