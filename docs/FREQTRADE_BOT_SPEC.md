# Freqtrade Crypto Bot Module (ft.*)

WallPilot Pro Phase 6 — Freqtrade engine integration for crypto spot automation.

## Features in UI (`/crypto-bot`)

- **Overview** — Install → Backtest → Dry-run workflow
- **Capabilities** — Dry-run, backtest, hyperopt, FreqAI, protection, multi-exchange
- **Backtest** — Latest snapshot metrics
- **Live monitor** — Sync from Freqtrade REST API (profit, open trades)
- **Setup** — Clone, install, single-instance start commands

## Engine install

```powershell
npm run setup:freqtrade
```

Clones `shinkang888-code/freqtrade` (branch `local-setup`) to `../freqtrade` and runs setup.

## Environment

```
FREQTRADE_API_URL=http://127.0.0.1:8080
FREQTRADE_API_USER=freqtrader
FREQTRADE_API_PASSWORD=freqtrader
```

## Membership

| Tier | View | Live sync |
|------|------|-----------|
| Free / Day trading | ✓ | — |
| Premium / Elite | ✓ | ✓ |
