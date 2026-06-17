# WallPilot Pro 구독제 시스템 명세

## 1. 목표

- Google OAuth 가입 시 **Free 등급 + active** 자동 부여
- 유료 등급(day_trading/pro, premium, elite)은 **Stripe/Danal 월구독 결제**로만 승급
- 결제 실패·취소·플랜 종료 시 **Free(inactive)** 자동 다운그레이드
- 관리자 페이지는 **admin / sub_admin**만 접근
- 지정 계정: `shinkang888@gmail.com` → admin, `kangjunchul8@gmail.com` → sub_admin

## 2. 등급 모델

| UI 등급 | DB plan | 승급 경로 |
|---------|---------|-----------|
| Free | free / inactive | Google 가입 기본값 |
| Day Trading | pro / active | Stripe/Danal 월구독 |
| Premium | premium / active | Stripe/Danal 월구독 |
| Elite | elite / active | Stripe/Danal 월구독 |

- `admin` 역할: entitlements는 코드상 elite 전체 허용 (구독과 무관)
- `sub_admin` 역할: **일반 사용자와 동일** entitlements (관리 콘솔 접근만 추가)

## 3. 역할 (RBAC)

| 역할 | 관리 페이지 | entitlements | 역할 변경 | 사용자 삭제 |
|------|------------|--------------|-----------|-------------|
| user | ✗ | 구독 기반 | ✗ | ✗ |
| sub_admin | ✓ | 구독 기반 | user/sub_admin만 | ✗ |
| admin | ✓ | elite | 전체 | ✓ |

## 4. 가입 플로우

```
Google OAuth → auth.users INSERT
  → handle_new_user 트리거
    → admin 이메일: role=admin, status=active, plan=elite/active
    → sub_admin 이메일: role=sub_admin, status=active, plan=free/inactive
    → 일반: role=user, status=active, plan=free/inactive
```

- `AUTH_AUTO_APPROVE` 기본값 `false` (레거시 pending은 로그인 시 active 전환만, plan 변경 없음)

## 5. 결제 연동

### Stripe Webhook (`POST /api/stripe/webhook`)

| Stripe status | DB plan | DB status |
|---------------|---------|-----------|
| active, trialing | price → plan | active/trialing |
| canceled, unpaid, past_due, incomplete, incomplete_expired | free | inactive |

### Danal

- 결제 완료: `applyPaidTier` (provider=danal)
- 취소/만료: `applyFreeTier` (향후 webhook/배치 연동)

### 관리자 수동 override

- `setUserPlanOverride`: `payment_provider=manual` 설정 (결제 없이 지원용)

## 6. API 세션 가드

- `requireStaffSession`: admin | sub_admin
- `requireFullAdminSession`: admin only (삭제, 역할 admin 지정, Stripe webhook 수정)

## 7. 환경 변수

| 변수 | 용도 |
|------|------|
| BOOTSTRAP_ADMIN_EMAIL | admin bootstrap (기본 shinkang888) |
| AUTH_AUTO_APPROVE | pending → active (plan 변경 없음) |
| STRIPE_* | 결제/웹훅 |

## 8. 검증

```bash
npm run test:subscription-system
npm run test:auth-entitlements
```

## 9. 배포

```bash
npm run supabase:db:push
npm run vercel:deploy
```
