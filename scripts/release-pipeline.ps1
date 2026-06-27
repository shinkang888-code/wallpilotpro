# WallPilot Pro — recommended release pipeline (auto-run steps)
# Usage: pwsh scripts/release-pipeline.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== 1/5 Build ==" -ForegroundColor Cyan
npm run build

Write-Host "== 2/5 Auth & subscription tests ==" -ForegroundColor Cyan
npm run test:auth-entitlements
if (Test-Path package.json) {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  if ($pkg.scripts.'test:subscription-system') { npm run test:subscription-system }
}

Write-Host "== 3/5 Supabase migration (requires supabase login) ==" -ForegroundColor Cyan
try { npm run supabase:db:push } catch { Write-Warning "supabase:db:push skipped or failed: $_" }

Write-Host "== 4/5 Vercel production deploy ==" -ForegroundColor Cyan
npx vercel deploy --prod --yes

Write-Host "== 5/5 Smoke check ==" -ForegroundColor Cyan
Start-Sleep -Seconds 8
$r = Invoke-WebRequest -Uri "https://wallpilotpro.vercel.app" -UseBasicParsing -TimeoutSec 30
Write-Host "Production: HTTP $($r.StatusCode)" -ForegroundColor Green

Write-Host "Done." -ForegroundColor Green
