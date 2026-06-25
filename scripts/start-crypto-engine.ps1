Set-ExecutionPolicy -Scope Process Bypass -Force
$ErrorActionPreference = "Stop"

$WallPilotRoot = Split-Path -Parent $PSScriptRoot
$FreqtradeRoot = Join-Path (Split-Path -Parent $WallPilotRoot) "freqtrade"

Write-Host "==> WallPilot Crypto Engine 연동" -ForegroundColor Cyan

# 1) Freqtrade 봇 시작 (백그라운드)
$ftScript = Join-Path $FreqtradeRoot "scripts\start-bot.ps1"
if (-not (Test-Path $ftScript)) {
    throw "Freqtrade not found at $FreqtradeRoot — run scripts/setup-freqtrade.ps1 first."
}

Write-Host "==> Starting Freqtrade bot (dry-run)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", $ftScript
) -WindowStyle Minimized

Start-Sleep -Seconds 8

$auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("freqtrader:freqtrader"))
$pingOk = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/ping" -Headers @{ Authorization = $auth } -TimeoutSec 3
        if ($r.status -eq "pong") { $pingOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if (-not $pingOk) {
    Write-Host "WARN: Freqtrade ping failed — check the minimized bot window." -ForegroundColor Yellow
} else {
    Write-Host "OK: Freqtrade API http://127.0.0.1:8080" -ForegroundColor Green
}

# 2) WallPilot dev (이미 실행 중이면 스킵)
$wpUp = $false
try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 2
    $wpUp = $true
} catch {}

if (-not $wpUp) {
    Write-Host "==> Starting WallPilot dev server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", "cd '$WallPilotRoot'; npm run dev"
    ) -WindowStyle Minimized
    Start-Sleep -Seconds 6
}

# 3) 연결 테스트
Set-Location $WallPilotRoot
npx tsx scripts/test-freqtrade-connection.ts

Write-Host ""
Write-Host "Open:" -ForegroundColor Cyan
Write-Host "  Local:      http://localhost:5173/crypto-bot"
Write-Host "  Production: https://wallpilotpro.vercel.app/crypto-bot (로컬 봇 직결 — 브라우저 CORS)"
Write-Host "  Freqtrade:  http://127.0.0.1:8080  (freqtrader / freqtrader)"
