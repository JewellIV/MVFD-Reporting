# Frontend Deployment Script for Windows PowerShell
# This script builds the frontend and prepares it for cPanel deployment

Write-Host "`n=== Frontend Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create .env.production file
Write-Host "Step 1: Creating .env.production..." -ForegroundColor Yellow
$envFile = "client\.env.production"
if (!(Test-Path $envFile)) {
    $apiUrl = "https://mvfd-reporting.vercel.app/api"
    @"
REACT_APP_API_URL=$apiUrl
"@ | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "✅ Created .env.production with API URL: $apiUrl" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.production already exists, checking contents..." -ForegroundColor Yellow
    $content = Get-Content $envFile
    if ($content -notmatch "REACT_APP_API_URL") {
        Write-Host "   Adding REACT_APP_API_URL..." -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "REACT_APP_API_URL=https://mvfd-reporting.vercel.app/api"
    }
    Write-Host "✅ .env.production ready" -ForegroundColor Green
}

# Step 2: Install dependencies
Write-Host "`nStep 2: Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 3: Build frontend
Write-Host "`nStep 3: Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green

# Step 4: Copy to deployment folder
Write-Host "`nStep 4: Copying to build-for-cpanel..." -ForegroundColor Yellow
Set-Location ..
if (Test-Path "build-for-cpanel") {
    Remove-Item "build-for-cpanel\*" -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item -Path "client\build\*" -Destination "build-for-cpanel\" -Recurse -Force

# Ensure .htaccess is copied
if (Test-Path "build-for-cpanel\.htaccess") {
    Write-Host "✅ .htaccess found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .htaccess missing - creating..." -ForegroundColor Yellow
    @"
RewriteEngine On
RewriteBase /

# Don't rewrite if the file exists
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Rewrite everything else to index.html
RewriteRule ^ index.html [L]
"@ | Out-File -FilePath "build-for-cpanel\.htaccess" -Encoding utf8
    Write-Host "✅ .htaccess created" -ForegroundColor Green
}

Write-Host "✅ Files copied to build-for-cpanel/" -ForegroundColor Green

# Step 5: Verify files
Write-Host "`nStep 5: Verifying files..." -ForegroundColor Yellow
$requiredFiles = @("index.html", ".htaccess", "static", "manifest.json")
$allPresent = $true
foreach ($file in $requiredFiles) {
    if (Test-Path "build-for-cpanel\$file") {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING!" -ForegroundColor Red
        $allPresent = $false
    }
}

if ($allPresent) {
    Write-Host "`n✅ Frontend is ready for deployment!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Go to cPanel File Manager" -ForegroundColor White
    Write-Host "2. Navigate to your subdomain folder (usually /home/username/reporting/)" -ForegroundColor White
    Write-Host "3. Upload ALL contents from build-for-cpanel/ folder" -ForegroundColor White
    Write-Host "4. Make sure .htaccess is uploaded (show hidden files)" -ForegroundColor White
    Write-Host "5. Visit https://reporting.mangohickfire.com" -ForegroundColor White
} else {
    Write-Host "`n❌ Some files are missing. Please check the build." -ForegroundColor Red
}

Write-Host "`n=== Deployment Script Complete ===" -ForegroundColor Cyan

