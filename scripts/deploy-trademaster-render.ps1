# Deploy WallPilot TradeMaster worker to Render
# Prerequisite: render login (browser authorize once)
$ErrorActionPreference = "Stop"
$render = "$env:USERPROFILE\.local\bin\render.exe"
if (-not (Test-Path $render)) { throw "Install Render CLI first: see docs/TRADEMASTER_WORKER_DEPLOY.md" }

$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Creating Render web service (docker, rootDir=services/trademaster-worker)..."
$json = render services create `
  --name wallpilot-trademaster-worker `
  --type web_service `
  --runtime docker `
  --root-directory services/trademaster-worker `
  --repo https://github.com/shinkang888-code/wallpilotpro `
  --branch main `
  --plan free `
  --region oregon `
  --health-check-path /api/TradeMaster/healthcheck `
  --env-var TM_TRAIN_SECONDS=18 `
  --env-var TM_TEST_SECONDS=12 `
  --confirm -o json

Write-Host $json
$url = ($json | ConvertFrom-Json).service.serviceDetails.url
if (-not $url) { throw "Could not read service URL from Render response" }

Write-Host "Worker URL: $url"
Write-Host "Updating Vercel TRADEMASTER_SERVICE_URL..."
echo $url | vercel env add TRADEMASTER_SERVICE_URL production --force 2>$null
if ($LASTEXITCODE -ne 0) { echo $url | vercel env add TRADEMASTER_SERVICE_URL production }
npm run vercel:deploy
Write-Host "Done. Test: `$env:TRADEMASTER_SERVICE_URL='$url'; npm run test:trademaster-worker"
