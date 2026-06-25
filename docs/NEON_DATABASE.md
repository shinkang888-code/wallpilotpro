# Neon PostgreSQL — WallPilot Pro

WallPilot 앱 **인증·RLS는 Supabase**를 사용합니다. Neon DB는 동일 스키마를 호스팅하는 **보조 Postgres** (개발·분석·백업) 용도입니다.

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| **프로젝트명** | `wallpilotpro` |
| **Project ID** | `round-tree-18996076` |
| **Branch** | `main` (`br-twilight-voice-adddinei`) |
| **Database** | `neondb` |
| **Console** | https://console.neon.tech/app/projects/round-tree-18996076 |

## 적용된 마이그레이션 (12개)

`supabase/migrations/` 전체 + Neon auth bootstrap (`scripts/neon/00_bootstrap_auth.sql`).

- `schema_migrations` 테이블로 버전 추적
- `toss_trader`, `crypto_bot` 메뉴 권한 포함

## 로컬에서 재실행

```powershell
# Neon Console → Connection string 복사 후
$env:DATABASE_URL = "postgresql://..."
npm run migrate:neon
```

이미 적용된 버전은 자동 skip 됩니다.

## Neon CLI (neonctl)

```powershell
npx neonctl projects list
npx neonctl connection-string --project-id round-tree-18996076
```

## 주의

- `DATABASE_URL`·비밀번호는 **git에 커밋하지 마세요** (`.env.local`만 사용).
- Supabase `auth.users` 트리거는 Neon에서 **auth 스키마 stub**으로 동작합니다. 프로덕션 로그인은 Supabase를 계속 사용하세요.
