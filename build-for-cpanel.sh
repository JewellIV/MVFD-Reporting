#!/bin/bash

# Mangohick Fire Reporting - Build Script for cPanel Deployment
# This script prepares your React app for deployment to cPanel

set -e  # Exit on error

echo "🚒 Mangohick Fire Reporting - cPanel Build Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${NC}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Starting build process for cPanel deployment..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js 16 or higher is required. You have Node.js $NODE_VERSION"
    exit 1
fi

print_success "Node.js version check passed (v$NODE_VERSION+)"
echo ""

# Navigate to client directory
cd client

print_info "Installing client dependencies..."
if ! npm install; then
    print_warning "npm install failed. Retrying with --legacy-peer-deps ..."
    npm install --legacy-peer-deps --no-audit --no-fund
fi

if [ $? -ne 0 ]; then
    print_error "Failed to install client dependencies"
    exit 1
fi

print_success "Client dependencies installed"
echo ""

# Check if production.env exists
if [ ! -f "production.env" ]; then
    print_warning "production.env not found. Creating from env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_info "Please update .env with your production configuration"
    else
        print_error "No env.example found. Please create .env manually"
        exit 1
    fi
fi

# Load environment variables
if [ -f "production.env" ]; then
    print_info "Loading production environment variables..."
    set -a
    source production.env
    set +a
fi

print_info "Building React application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

print_success "Build completed successfully!"
echo ""

# Check if build directory exists
if [ ! -d "build" ]; then
    print_error "Build directory not found. Build may have failed."
    exit 1
fi

# Navigate back to root
cd ..

# Create deployment package
print_info "Creating deployment package..."
BUILD_DIR="build-for-cpanel"
rm -rf "$BUILD_DIR"
mkdir "$BUILD_DIR"

# Copy build files
cp -r client/build/* "$BUILD_DIR/"

# Create .htaccess for React Router
print_info "Creating .htaccess file for React Router..."
cat > "$BUILD_DIR/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
  
  # Security headers
  <IfModule mod_headers.c>
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  </IfModule>
  
  # Compress text files
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
  </IfModule>
  
  # Cache static assets
  <IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
  </IfModule>
</IfModule>
EOF

print_success ".htaccess file created"
echo ""

# Create README for deployment
print_info "Creating deployment instructions..."
cat > "$BUILD_DIR/DEPLOY_INSTRUCTIONS.txt" << 'EOF'
Mangohick Fire Reporting System - cPanel Deployment Instructions
=================================================================

FILES IN THIS FOLDER ARE READY TO UPLOAD TO CPANEL

DEPLOYMENT STEPS:
-----------------

1. Log into your cPanel account

2. Open File Manager

3. Navigate to your domain's public_html folder
   (or create a subdomain folder if needed)

4. Upload ALL files from this build directory to public_html

5. Make sure you upload the .htaccess file (it starts with a dot)

6. Set file permissions:
   - Folders: 755
   - Files: 644

7. Access your site at:
   https://yourdomain.com

IMPORTANT NOTES:
----------------

- You need a separate backend server for the API
- See CPANEL_DEPLOYMENT.md for full instructions
- Recommended: Deploy backend to Render.com or Railway.app
- Update API URL in environment variables before building

BACKEND API:
------------

Your backend should be deployed separately on:
- Render.com (recommended - free tier)
- Railway.app
- AWS/GCP/Azure
- Or your own VPS

The backend connects to your MySQL database at:
sdb-86.hosting.stackcp.net

TROUBLESHOOTING:
----------------

If you see 404 errors:
- Check that .htaccess file is uploaded
- Verify mod_rewrite is enabled on your server
- Check file permissions

If you can't connect to API:
- Verify your backend is running
- Check CORS settings on backend
- Verify API URL in your configuration

SUPPORT:
--------

Check CPANEL_DEPLOYMENT.md for detailed instructions
EOF

print_success "Deployment instructions created"
echo ""

# Count files
FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)
FOLDER_COUNT=$(find "$BUILD_DIR" -type d | wc -l)

print_success "Build package created: $BUILD_DIR"
print_info "Files: $FILE_COUNT"
print_info "Folders: $FOLDER_COUNT"
echo ""

# Show next steps
echo "=================================================="
echo "✨ BUILD COMPLETE!"
echo "=================================================="
echo ""
echo "📦 Your files are ready in: $BUILD_DIR/"
echo ""
echo "NEXT STEPS:"
echo "==========="
echo ""
echo "1. Upload ALL files from '$BUILD_DIR' to your cPanel public_html"
echo ""
echo "2. Make sure to upload the .htaccess file"
echo ""
echo "3. Set permissions:"
echo "   - Folders: 755"
echo "   - Files: 644"
echo ""
echo "4. Deploy your backend separately (see CPANEL_DEPLOYMENT.md)"
echo ""
echo "5. Test your site!"
echo ""
echo "📚 Full instructions: CPANEL_DEPLOYMENT.md"
echo ""

print_info "To compress for upload: tar -czf build.tar.gz $BUILD_DIR"
print_info "Or: zip -r build.zip $BUILD_DIR"
echo ""

