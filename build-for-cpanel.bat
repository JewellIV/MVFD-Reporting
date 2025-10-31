@echo off
REM Mangohick Fire Reporting - Build Script for cPanel Deployment (Windows)
REM This script prepares your React app for deployment to cPanel

echo.
echo ================================================================
echo   Mangohick Fire Reporting - cPanel Build Script (Windows)
echo ================================================================
echo.

setlocal enabledelayedexpansion

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)
if not exist "client" (
    echo [ERROR] client directory not found
    exit /b 1
)
if not exist "server" (
    echo [ERROR] server directory not found
    exit /b 1
)

echo [INFO] Starting build process for cPanel deployment...
echo.

REM Navigate to client directory
cd client

echo [INFO] Installing client dependencies...
call npm install

if errorlevel 1 (
    echo [WARN] npm install failed. Retrying with --legacy-peer-deps ...
    call npm install --legacy-peer-deps --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] Failed to install client dependencies
        exit /b 1
    )
)

echo [SUCCESS] Client dependencies installed
echo.

REM Check if production.env exists
if not exist "production.env" (
    echo [WARNING] production.env not found.
    if exist "env.example" (
        copy env.example .env >nul
        echo [INFO] Created .env from env.example
        echo [INFO] Please update .env with your production configuration
    ) else (
        echo [ERROR] No env.example found. Please create .env manually
        exit /b 1
    )
)

echo [INFO] Building React application...
call npm run build

if errorlevel 1 (
    echo [ERROR] Build failed!
    exit /b 1
)

echo [SUCCESS] Build completed successfully!
echo.

REM Check if build directory exists
if not exist "build" (
    echo [ERROR] Build directory not found. Build may have failed.
    exit /b 1
)

REM Navigate back to root
cd ..

REM Create deployment package
echo [INFO] Creating deployment package...
set BUILD_DIR=build-for-cpanel

REM Remove old build directory if exists
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

REM Copy build files
echo [INFO] Copying build files...
xcopy client\build\* "%BUILD_DIR%\" /E /I /H /Y >nul

REM Create .htaccess for React Router
echo [INFO] Creating .htaccess file for React Router...
(
echo ^<IfModule mod_rewrite.c^>
echo   RewriteEngine On
echo   RewriteBase /
echo   
echo   # Don't rewrite files or directories
echo   RewriteCond %%{REQUEST_FILENAME} -f [OR]
echo   RewriteCond %%{REQUEST_FILENAME} -d
echo   RewriteRule ^ - [L]
echo   
echo   # Rewrite everything else to index.html
echo   RewriteRule ^ index.html [L]
echo   
echo   # Security headers
echo   ^<IfModule mod_headers.c^>
echo     Header set X-Frame-Options "SAMEORIGIN"
echo     Header set X-Content-Type-Options "nosniff"
echo     Header set X-XSS-Protection "1; mode=block"
echo     Header set Referrer-Policy "strict-origin-when-cross-origin"
echo     Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
echo   ^</IfModule^>
echo   
echo   # Compress text files
echo   ^<IfModule mod_deflate.c^>
echo     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
echo   ^</IfModule^>
echo   
echo   # Cache static assets
echo   ^<IfModule mod_expires.c^>
echo     ExpiresActive On
echo     ExpiresByType image/jpg "access plus 1 year"
echo     ExpiresByType image/jpeg "access plus 1 year"
echo     ExpiresByType image/gif "access plus 1 year"
echo     ExpiresByType image/png "access plus 1 year"
echo     ExpiresByType image/svg+xml "access plus 1 year"
echo     ExpiresByType text/css "access plus 1 month"
echo     ExpiresByType application/javascript "access plus 1 month"
echo     ExpiresByType application/x-javascript "access plus 1 month"
echo   ^</IfModule^>
echo ^</IfModule^>
) > "%BUILD_DIR%\.htaccess"

echo [SUCCESS] .htaccess file created
echo.

REM Create README for deployment
echo [INFO] Creating deployment instructions...
(
echo Mangohick Fire Reporting System - cPanel Deployment Instructions
echo =================================================================
echo.
echo FILES IN THIS FOLDER ARE READY TO UPLOAD TO CPANEL
echo.
echo DEPLOYMENT STEPS:
echo -----------------
echo.
echo 1. Log into your cPanel account
echo.
echo 2. Open File Manager
echo.
echo 3. Navigate to your domain's public_html folder
echo    (or create a subdomain folder if needed)
echo.
echo 4. Upload ALL files from this build directory to public_html
echo.
echo 5. Make sure you upload the .htaccess file (it starts with a dot)
echo.
echo 6. Set file permissions:
echo    - Folders: 755
echo    - Files: 644
echo.
echo 7. Access your site at:
echo    https://yourdomain.com
echo.
echo IMPORTANT NOTES:
echo ----------------
echo.
echo - You need a separate backend server for the API
echo - See CPANEL_DEPLOYMENT.md for full instructions
echo - Recommended: Deploy backend to Render.com or Railway.app
echo - Update API URL in environment variables before building
echo.
echo BACKEND API:
echo ------------
echo.
echo Your backend should be deployed separately on:
echo - Render.com (recommended - free tier)
echo - Railway.app
echo - AWS/GCP/Azure
echo - Or your own VPS
echo.
echo The backend connects to your MySQL database at:
echo sdb-86.hosting.stackcp.net
echo.
echo TROUBLESHOOTING:
echo ----------------
echo.
echo If you see 404 errors:
echo - Check that .htaccess file is uploaded
echo - Verify mod_rewrite is enabled on your server
echo - Check file permissions
echo.
echo If you can't connect to API:
echo - Verify your backend is running
echo - Check CORS settings on backend
echo - Verify API URL in your configuration
echo.
echo SUPPORT:
echo --------
echo.
echo Check CPANEL_DEPLOYMENT.md for detailed instructions
) > "%BUILD_DIR%\DEPLOY_INSTRUCTIONS.txt"

echo [SUCCESS] Deployment instructions created
echo.

echo ================================================================
echo   BUILD COMPLETE!
echo ================================================================
echo.
echo Your files are ready in: %BUILD_DIR%\
echo.
echo NEXT STEPS:
echo ===========
echo.
echo 1. Upload ALL files from '%BUILD_DIR%' to your cPanel public_html
echo.
echo 2. Make sure to upload the .htaccess file
echo.
echo 3. Set permissions:
echo    - Folders: 755
echo    - Files: 644
echo.
echo 4. Deploy your backend separately (see CPANEL_DEPLOYMENT.md)
echo.
echo 5. Test your site!
echo.
echo Full instructions: CPANEL_DEPLOYMENT.md
echo.

endlocal

pause

