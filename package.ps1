# PowerShell Package script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

Write-Host "📦 Pterodactyl Telegram Bot - Package Creator" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

# Get version
$defaultVersion = Get-Date -Format "yyyyMMdd_HHmmss"
$version = Read-Host "Package version [$defaultVersion]"
if ([string]::IsNullOrEmpty($version)) {
    $version = $defaultVersion
}

$packageName = "pterodactyl-telegram-bot-v$version"
$tempDir = "$env:TEMP\$packageName"
$zipFile = "$packageName.zip"

Write-Host "ℹ️ Creating package: $packageName" -ForegroundColor Blue

# Remove existing temp directory
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

# Create temporary directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "ℹ️ Copying project files..." -ForegroundColor Blue

# Copy essential files and directories
$filesToCopy = @(
    "src",
    ".env.example",
    "composer.json", 
    "index.php",
    "install.sh",
    "quick-setup.sh", 
    "update.sh",
    "deploy.php",
    "test.php",
    "nginx.conf",
    "supervisor.conf",
    "systemd.service", 
    "crontab.txt",
    "README.md",
    "DEPLOYMENT.md"
)

foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            # It's a directory
            Copy-Item $item -Destination $tempDir -Recurse -Force
        } else {
            # It's a file
            Copy-Item $item -Destination $tempDir -Force
        }
        Write-Host "  ✅ Copied: $item" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Not found: $item" -ForegroundColor Yellow
    }
}

# Create logs directory if not exists
$logsDir = "$tempDir\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Create installation info
$installContent = @"
Pterodactyl Telegram Bot - Installation Instructions
====================================================

Quick Start (Ubuntu VPS):
1. Extract this zip file
2. cd pterodactyl-telegram-bot-v$version/
3. chmod +x quick-setup.sh
4. ./quick-setup.sh
5. Follow the prompts

Detailed Instructions:
* See README.md for complete documentation
* See DEPLOYMENT.md for deployment guide

Scripts Available:
* quick-setup.sh   : Quick 5-minute setup
* install.sh       : Advanced installation with options
* update.sh        : Update existing installation
* deploy.php       : Deployment utilities
* test.php         : Test all components

Support:
* Telegram: @ImTamaa
* GitHub: [Repository URL]

Version: $version
Created: $(Get-Date)
Author: Pablos (@ImTamaa)
"@

$installContent | Out-File -FilePath "$tempDir\INSTALL.txt" -Encoding UTF8

# Create version info
$version | Out-File -FilePath "$tempDir\VERSION" -Encoding UTF8

# Create .gitignore
$gitignoreContent = @"
# Environment files
.env
.env.local

# Logs
logs/*.log
logs/*.db

# Vendor (will be installed by composer)
vendor/

# Temporary files
*.tmp
*.temp

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
"@

$gitignoreContent | Out-File -FilePath "$tempDir\.gitignore" -Encoding UTF8

Write-Host "ℹ️ Creating zip package..." -ForegroundColor Blue

# Create zip file using PowerShell
$currentLocation = Get-Location
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, "$currentLocation\$zipFile")

# Cleanup
Remove-Item $tempDir -Recurse -Force

# Show package info
Write-Host ""
Write-Host "✅ Package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "ℹ️ Package Details:" -ForegroundColor Blue
Write-Host "  File: $zipFile"
Write-Host "  Size: $((Get-Item $zipFile).Length / 1MB | ForEach-Object { "{0:N2} MB" -f $_ })"
Write-Host "  Version: $version"
Write-Host ""

Write-Host "ℹ️ Installation Commands:" -ForegroundColor Blue
Write-Host "  wget https://your-server.com/$zipFile"
Write-Host "  unzip $zipFile"
Write-Host "  cd $packageName/"
Write-Host "  ./quick-setup.sh"
Write-Host ""

Write-Host "📦 Package ready for deployment!" -ForegroundColor Green
Write-Host "⚠️ Don't forget to upload to your server or repository!" -ForegroundColor Yellow
