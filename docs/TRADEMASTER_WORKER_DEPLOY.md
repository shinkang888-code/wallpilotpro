# TradeMaster Worker 배포 가이드

WallPilot Pro **Full RL**은 `TRADEMASTER_SERVICE_URL`이 가리키는 worker의 아래 API를 호출합니다.

| Method | Path |
|--------|------|
| GET | `/api/TradeMaster/healthcheck` → `error_code: 0` |
| POST | `/api/TradeMaster/train` |
| POST | `/api/TradeMaster/train_status` |
| POST | `/api/TradeMaster/test` |
| POST | `/api/TradeMaster/test_status` |

---

## A. Render (영구 URL · 권장)

**Render CLI v2.20** 설치됨: `%USERPROFILE%\.local\bin\render.exe`

**1) 로그인 (1회)**

```powershell
render login
# 브라우저에서 Authorize CLI
```

**2) Blueprint 또는 CLI 배포**

루트 `render.yaml` — GitHub `shinkang888-code/wallpilotpro` 연결 후:

```powershell
cd c:\cursor\wallpilot\wallpilotpro
.\scripts\deploy-trademaster-render.ps1
```

수동 CLI:

```powershell
render services create `
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
```

**3) Vercel 연동**

```
TRADEMASTER_SERVICE_URL=https://wallpilot-trademaster-worker.onrender.com
```

Free tier: cold start 시 첫 요청 30~60초 지연 가능.

---

## B. Railway (CPU)

```bash
cd services/trademaster-worker
railway login
railway init
railway up
railway domain
```

Vercel:

```bash
vercel env add TRADEMASTER_SERVICE_URL production
npm run vercel:deploy
```

---

## C. 공식 TradeMaster GPU worker (conda VM)

소스: `_repo-analysis/TradeMaster/deploy/backend_service.py`

### 1) VM 준비 (Ubuntu 20.04+, GPU 권장)

```bash
# Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b -p $HOME/miniconda3
conda create -n TradeMaster python=3.9 -y
conda activate TradeMaster

git clone https://github.com/TradeMaster-NTU/TradeMaster.git
cd TradeMaster
pip install torch==1.12.1+cu113 torchvision==0.13.1+cu113 -f https://download.pytorch.org/whl/torch_stable.html
pip install -r requirements.txt
pip install flask flask-cors mmcv pandas pytz regex
```

### 2) Worker 실행

```bash
cd deploy
# 외부 접근 허용
python -c "
import backend_service as bs
bs.app.run('0.0.0.0', 8080)
"
# 또는 gunicorn / systemd + nginx TLS
```

### 3) Vercel 연동

```
TRADEMASTER_SERVICE_URL=https://your-vm-or-lb.example.com
```

포트 8080은 **리버스 프록시(nginx)** 뒤 HTTPS 443 권장.

---

## C. 로컬 검증

```bash
cd services/trademaster-worker
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8089

curl http://127.0.0.1:8089/api/TradeMaster/healthcheck
```

`.env.local`:

```
TRADEMASTER_SERVICE_URL=http://127.0.0.1:8089
```

RL Lab → **Full RL** → Worker online 배지 확인.

---

## D. Docker (공식 TradeMaster 이미지)

```bash
cd _repo-analysis/TradeMaster
docker build -t trademaster-gpu .
docker run --gpus all -p 8080:8080 trademaster-gpu
```

CUDA 11.3 + conda 환경 포함 (빌드 30분+).

---

*경량 worker는 Full RL UI·폴링 파이프라인 검증용. 실제 RL 학습은 B/C 경로 사용.*
