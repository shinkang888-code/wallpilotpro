# WallPilot Pro — Global i18n 개발명세서 (v1.0)

> 작성일: 2026-06-16 · 8개 언어 · O(1) 정적 lookup · lazy language packs

---

## 0. Executive Summary

WallPilot Pro UI 텍스트(449키)를 **8개 언어**로 제공하는 글로벌 i18n 모듈.

| 순서 | 코드 | 언어 | HTML lang |
|------|------|------|-----------|
| 1 | `en` | English | en |
| 2 | `ko` | 한국어 | ko |
| 3 | `ja` | 日本語 | ja |
| 4 | `zh` | 简体中文 | zh-Hans |
| 5 | `vi` | Tiếng Việt | vi |
| 6 | `tl` | Filipino | fil |
| 7 | `id` | Bahasa Indonesia | id |
| 8 | `hi` | हिन्दी | hi |

**속도 설계 (최우선)**

- 런타임 번역 API **사용 안 함** — 빌드 타임 정적 문자열
- `t(key)` = **O(1)** Record lookup (<0.001ms)
- 언어 팩 **코드 스플itting** — 선택 locale만 동적 import
- English **warm preload** — 첫 paint fallback
- 인접 locale **hover prefetch** — 전환 지연 최소화
- `localStorage` (`wallpilotpro.locale`) — 재방문 즉시 적용

---

## 1. 아키텍처

```
src/lib/i18n/
├── constants.ts          # LOCALE_ORDER, detectBrowserLocale
├── keys.generated.ts     # TranslationKey union (449)
├── pack-loader.ts        # lazy load + cache + translate()
├── provider.tsx          # I18nProvider, useI18n
└── packs/
    ├── en.json / en.ts   # source + generated TS
    ├── ko.json … hi.json
```

```
src/components/language-scroll-selector.tsx  # 가로 스크롤 8버튼
```

**데이터 흐름**

```
User clicks JA → setLang('ja') → loadPack('ja') [chunk] → cache → t() uses ja pack
Missing key     → fallback en pack → key name
```

---

## 2. UI — Language Scroll Selector

- Header 우측: `EN KO JA ZH VI TL ID HI` pill buttons
- `overflow-x-auto` + `snap-x` — 모바일에서 스크롤
- `max-w-[11rem]` on mobile, full on sm+
- `aria-checked` radiogroup 접근성
- `onMouseEnter` / `onFocus` → `preloadLocale`

---

## 3. API

```typescript
const { lang, setLang, t, ready } = useI18n();
t("nav_scanner"); // → "スキャナー" when lang=ja
```

```typescript
pickLocaleString(tier.name, lang); // membership tiers (8 langs inline)
tierFeatures(tierId, lang);        // feature bullet lists
```

---

## 4. 빌드·유지보수

```bash
npm run i18n:extract    # legacy en/ko from monolith (if needed)
npm run i18n:translate  # Gemini batch → ja/zh/vi/tl/id/hi JSON
npm run i18n:build      # JSON → .ts packs + keys.generated.ts
npm run test:i18n-global
```

---

## 5. Entitlements / 범위

- **UI 문자열만** i18n — AI 생성 콘텐츠(리포트 본문, 시그널)는 별도
- 브랜드명·API 키명·URL은 번역 제외
- `document.documentElement.lang` + `notranslate` (Chrome 자동번역 방지)

---

## 6. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| t() lookup | 100k calls < 50ms |
| locale switch | p95 < 100ms (cached) |
| first load | en only bundle + async active locale |
| key parity | 449 keys × 8 locales |

---

## 7. 테스트

`scripts/test-i18n-global.ts` — key count, ja≠en sample, lookup benchmark

---

*구현: `src/lib/i18n/*`, `LanguageScrollSelector`, `docs/I18N_GLOBAL_SPEC.md`*
