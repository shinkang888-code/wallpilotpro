# Deploy WallPilot TradingAgents sidecar to Render + wire Vercel TRADINGAGENTS_SERVICE_URL
# Prerequisite: render login (browser authorize once)
$ErrorActionPreference = "Stop"
$render = "$env:USERPROFILE\.local\bin\render.exe"
if (-not (Test-Path $render)) { throw "Install Render CLI first: see docs/TRADINGAGENTS_SIDECAR_DEPLOY.md" }

$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
Set-Location (Split-Path $PSScriptRoot -Parent)

$existing = & $render services list -o json | ConvertFrom-Json
$found = $existing | Where-Object { $_.service.name -eq "wallpilot-tradingagents-api" }
if ($found) {
  $url = $found.service.serviceDetails.url
  Write-Host "Service already exists: $url"
} else {
  Write-Host "Creating Render web service (docker, rootDir=services/tradingagents-api)..."
  $json = & $render services create `
    --name wallpilot-tradingagents-api `
    --type web_service `
    --runtime docker `
    --root-directory services/tradingagents-api `
    --repo https://github.com/shinkang888-code/wallpilotpro `
    --branch main `
    --plan free `
    --region oregon `
    --health-check-path /health `
    --env-var TRADINGAGENTS_MAX_DEBATE_ROUNDS=1 `
    --confirm -o json
  $parsed = $json | ConvertFrom-Json
  $url = $parsed.service.serviceDetails.url
  if (-not $url -and $parsed -is [System.Array]) {
    $url = $parsed[0].service.serviceDetails.url
  }
  if (-not $url) { throw "Could not read service URL from Render response" }
  Write-Host "Worker URL: $url"
}

Write-Host "Set GEMINI_API_KEY on Render Dashboard for this service (required for /propagate)."
Write-Host "Updating Vercel TRADINGAGENTS_SERVICE_URL..."
echo $url | vercel env add TRADINGAGENTS_SERVICE_URL production --force 2>$null
if ($LASTEXITCODE -ne 0) { echo $url | vercel env add TRADINGAGENTS_SERVICE_URL production }

Write-Host "Deploying WallPilot Pro..."
npm run vercel:deploy
Write-Host "Done. Health: curl $url/health"
Write-Host "After GEMINI on Render: test /agents/desk with engine Python or Auto."
