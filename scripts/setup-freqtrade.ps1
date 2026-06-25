Set-ExecutionPolicy -Scope Process Bypass -Force
$ErrorActionPreference = "Stop"

$WallPilotRoot = Split-Path -Parent $PSScriptRoot
$EngineRoot = Join-Path (Split-Path -Parent $WallPilotRoot) "freqtrade"
$Repo = "https://github.com/shinkang888-code/freqtrade.git"
$Branch = "local-setup"

Write-Host "==> WallPilot Pro · Freqtrade engine setup" -ForegroundColor Cyan

if (-not (Test-Path $EngineRoot)) {
    Write-Host "Cloning $Repo ($Branch) -> $EngineRoot"
    git clone -b $Branch $Repo $EngineRoot
} else {
    Write-Host "Engine folder exists: $EngineRoot"
}

Set-Location $EngineRoot

if (Test-Path ".\scripts\setup-local.ps1") {
    & powershell -ExecutionPolicy Bypass -File ".\scripts\setup-local.ps1"
} else {
    throw "setup-local.ps1 not found in $EngineRoot"
}

Write-Host ""
Write-Host "Done. Start bot:" -ForegroundColor Green
Write-Host "  cd $EngineRoot"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\start-bot.ps1"
