# PowerShell Helper to run deepwiki-rs via Docker or Cargo
Param (
    [string]$Action = "generate", # generate or serve
    [string]$ApiKey = $env:OPENAI_API_KEY
)

$ProjectPath = (Get-Location).Path
$OutputDir = Join-Path $ProjectPath "docs\architecture"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Nebras ERP - DeepWiki-RS (Litho) Architecture Runner   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if deepwiki-rs / litho is installed locally
$hasCargoBinary = Get-Command "deepwiki-rs" -ErrorAction SilentlyContinue
if ($hasCargoBinary) {
    Write-Host "✓ تم العثور على deepwiki-rs محلياً، جارٍ التنفيذ..." -ForegroundColor Green
    if ($Action -eq "serve") {
        deepwiki-rs serve
    } else {
        deepwiki-rs -p . -o docs/architecture
    }
    exit 0
}

# Otherwise, check Docker
$hasDocker = Get-Command "docker" -ErrorAction SilentlyContinue
if ($hasDocker) {
    Write-Host "✓ تشغيل deepwiki-rs عبر Docker Container المعزول..." -ForegroundColor Green
    
    # Build container if not existing
    $imageName = "nebras-deepwiki:latest"
    $dockerfilePath = "docker/deepwiki/Dockerfile"
    
    if (Test-Path $dockerfilePath) {
        Write-Host "جارٍ بناء صورة deepwiki عبر Docker..." -ForegroundColor Gray
        docker build -t $imageName -f $dockerfilePath .
        
        Write-Host "تشغيل التحليل المعماري للمشروع..." -ForegroundColor Green
        docker run --rm -v "${ProjectPath}:/workspace" -w /workspace -e OPENAI_API_KEY=$ApiKey $imageName -p /workspace -o /workspace/docs/architecture
    } else {
        Write-Host "ملف Dockerfile غير موجود في $dockerfilePath" -ForegroundColor Red
    }
    exit 0
}

Write-Host "⚠️ لم يتم العثور على deepwiki-rs أو Docker." -ForegroundColor Red
Write-Host "يرجى تشغيل: winget install Rustlang.Rustup ثم cargo install deepwiki-rs" -ForegroundColor Yellow
