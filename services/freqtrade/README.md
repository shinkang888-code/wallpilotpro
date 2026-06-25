# Freqtrade Engine (WallPilot Pro)

WallPilot Pro integrates the [Freqtrade](https://www.freqtrade.io) crypto trading bot as the **ft.*** module.

## Quick install (Windows)

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-freqtrade.ps1
```

This clones `shinkang888-code/freqtrade` (branch `local-setup`) into `../freqtrade` and runs the local setup script.

## Start single bot instance

```powershell
cd ../freqtrade
powershell -ExecutionPolicy Bypass -File .\scripts\start-bot.ps1
```

- WebUI: http://127.0.0.1:8080
- Credentials: `freqtrader` / `freqtrader`

## Connect to WallPilot dashboard

Set in WallPilot `.env.local` or Vercel:

```
FREQTRADE_API_URL=http://127.0.0.1:8080
FREQTRADE_API_USER=freqtrader
FREQTRADE_API_PASSWORD=freqtrader
```

For production, expose the Freqtrade API via VPN/tunnel or deploy the Render worker from `render.yaml` in the freqtrade repo.

## Capabilities

| Feature | Description |
|---------|-------------|
| Dry-run | Paper trade with live exchange data |
| Backtest | Historical strategy validation |
| Hyperopt | Parameter optimization |
| FreqAI | ML-based adaptive strategies |
| Multi-exchange | Binance, Bybit, Kraken via CCXT |
