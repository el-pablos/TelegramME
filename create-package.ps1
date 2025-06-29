# Simple PowerShell Package script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

Write-Host "Package Creator for Pterodactyl Telegram Bot" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

# Get version
$version = Get-Date -Format "yyyyMMdd_HHmmss"
$packageName = "pterodactyl-telegram-bot-v$version"
$zipFile = "$packageName.zip"

Write-Host "Creating package: $packageName" -ForegroundColor Blue

# Files to include in package
$filesToCopy = @(
    "src",
    "logs",
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
    "DEPLOYMENT.md",
    "package.sh"
)

# Create temp directory
$tempDir = "$env:TEMP\$packageName"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files
Write-Host "Copying files..." -ForegroundColor Blue
foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            Copy-Item $item -Destination $tempDir -Recurse -Force
        } else {
            Copy-Item $item -Destination $tempDir -Force
        }
        Write-Host "  Copied: $item" -ForegroundColor Green
    }
}

# Create logs directory if not exists
if (-not (Test-Path "$tempDir\logs")) {
    New-Item -ItemType Directory -Path "$tempDir\logs" -Force | Out-Null
}

# Create INSTALL.txt
$installText = @"
Pterodactyl Telegram Bot - Installation Instructions
====================================================

Quick Start (Ubuntu VPS):
1. Extract this zip file
2. cd pterodactyl-telegram-bot-v$version/
3. chmod +x quick-setup.sh
4. ./quick-setup.sh
5. Follow the prompts

Scripts Available:
- quick-setup.sh   : Quick 5-minute setup
- install.sh       : Advanced installation
- update.sh        : Update existing installation
- deploy.php       : Deployment utilities
- test.php         : Test all components

Version: $version
Author: Pablos (@ImTamaa)
"@

$installText | Out-File -FilePath "$tempDir\INSTALL.txt" -Encoding UTF8

# Create VERSION file
$version | Out-File -FilePath "$tempDir\VERSION" -Encoding UTF8

# Create zip
Write-Host "Creating zip file..." -ForegroundColor Blue
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, "$PWD\$zipFile")

# Cleanup
Remove-Item $tempDir -Recurse -Force

# Show results
$fileSize = (Get-Item $zipFile).Length / 1MB
Write-Host ""
Write-Host "Package created successfully!" -ForegroundColor Green
Write-Host "File: $zipFile" -ForegroundColor Yellow
Write-Host "Size: $($fileSize.ToString('F2')) MB" -ForegroundColor Yellow
Write-Host "Version: $version" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ready for deployment to Ubuntu VPS!" -ForegroundColor Green
