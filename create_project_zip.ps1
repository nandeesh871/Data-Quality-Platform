# PowerShell Script to Archive Data Quality Platform Codebase
# Excludes heavy dependencies like .venv and node_modules

$projectName = "Data_Quality_Platform"
$zipPath = Join-Path $PSScriptRoot "$projectName.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Archiving project workspace..." -ForegroundColor Cyan

# Create temporary directory for staging
$tempDir = Join-Path $env:TEMP "dq_platform_staging"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir > $null

# Copy backend (excluding .venv, __pycache__, data_quality.db, and uploads)
Write-Host "Staging backend..."
$backStaging = Join-Path $tempDir "backend"
Copy-Item -Path (Join-Path $PSScriptRoot "backend") -Destination $backStaging -Recurse
if (Test-Path (Join-Path $backStaging ".venv")) { Remove-Item (Join-Path $backStaging ".venv") -Recurse -Force }
if (Test-Path (Join-Path $backStaging "uploads")) { Remove-Item (Join-Path $backStaging "uploads") -Recurse -Force }
Get-ChildItem -Path $backStaging -Filter "__pycache__" -Recurse | Remove-Item -Recurse -Force
Get-ChildItem -Path $backStaging -Filter "*.db" -Recurse | Remove-Item -Force

# Copy frontend (excluding node_modules)
Write-Host "Staging frontend..."
$frontStaging = Join-Path $tempDir "frontend"
Copy-Item -Path (Join-Path $PSScriptRoot "frontend") -Destination $frontStaging -Recurse
if (Test-Path (Join-Path $frontStaging "node_modules")) { Remove-Item (Join-Path $frontStaging "node_modules") -Recurse -Force }
if (Test-Path (Join-Path $frontStaging "dist")) { Remove-Item (Join-Path $frontStaging "dist") -Recurse -Force }

# Copy other database and sample directories
Write-Host "Staging other folders..."
Copy-Item -Path (Join-Path $PSScriptRoot "database") -Destination (Join-Path $tempDir "database") -Recurse
Copy-Item -Path (Join-Path $PSScriptRoot "sample_data") -Destination (Join-Path $tempDir "sample_data") -Recurse

# Copy root scripts and files
Copy-Item -Path (Join-Path $PSScriptRoot "README.md") -Destination (Join-Path $tempDir "README.md")
Copy-Item -Path (Join-Path $PSScriptRoot "run_project.bat") -Destination (Join-Path $tempDir "run_project.bat")
Copy-Item -Path (Join-Path $PSScriptRoot "start_backend.bat") -Destination (Join-Path $tempDir "start_backend.bat")
Copy-Item -Path $PSCommandPath -Destination (Join-Path $tempDir "create_project_zip.ps1")

# Create Zip file
Write-Host "Generating ZIP archive..." -ForegroundColor Green
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up staging
Remove-Item $tempDir -Recurse -Force

Write-Host "ZIP Archive generated successfully at: $zipPath" -ForegroundColor Green
