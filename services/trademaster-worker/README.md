# TradeMaster Worker (WallPilot Sidecar)

## Upstream (공식 소스)

| 출처 | URL | 용도 |
|------|-----|------|
| **GitHub (공식)** | https://github.com/TradeMaster-NTU/TradeMaster | RL 퀀트 플랫폼 · `deploy/backend_service.py` API |
| **문서** | https://trademaster.readthedocs.io | task/dataset/agent 설정 |
| **Hugging Face** | TradeMaster 계열 모델·데모 검색 | 연구용 체크포인트 (워커 API와 별도) |
| **Kaggle** | 금융 RL/시계열 데이터셋 | DJ30 등 학습 데이터 (공식 worker는 내장 dataset 사용) |

WallPilot Pro는 공식 TradeMaster **HTTP API 스펙**과 호환되는 worker를 사용합니다.

- **Render (현재):** 경량 FastAPI worker — Full RL UI·train→test 폴링 연동 검증
- **GPU VM (선택):** 공식 repo `deploy/backend_service.py` — 실제 PPO 학습

## Render 배포 (이미 연결됨)

| 항목 | 값 |
|------|-----|
| 서비스 | `wallpilot-trademaster-worker` |
| URL | https://wallpilot-trademaster-worker.onrender.com |
| Health | `GET /api/TradeMaster/healthcheck` → `error_code: 0` |
| Repo | `shinkang888-code/wallpilotpro` · `services/trademaster-worker` |

Vercel production:

```
TRADEMASTER_SERVICE_URL=https://wallpilot-trademaster-worker.onrender.com
```

## 로컬 실행

```powershell
cd services/trademaster-worker
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8089
```

```powershell
$env:TRADEMASTER_SERVICE_URL="http://127.0.0.1:8089"
npm run test:trademaster-worker
```

## 공식 GPU worker (GitHub 클론)

```bash
git clone https://github.com/TradeMaster-NTU/TradeMaster.git
cd TradeMaster
# conda + CUDA — docs/TRADEMASTER_WORKER_DEPLOY.md §C 참고
cd deploy && python backend_service.py
```

동일 env `TRADEMASTER_SERVICE_URL`만 교체하면 WallPilot RL Lab **실행** 탭에서 Full RL 사용 가능.
