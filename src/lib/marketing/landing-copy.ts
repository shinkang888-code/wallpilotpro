// filepath: src/lib/marketing/landing-copy.ts
/** GTM 01_LANDING_COPY.md — KO/EN marketing strings (pickLocaleString). */
import type { AppLocale } from "@/lib/i18n/constants";

type L = Partial<Record<AppLocale, string>> & { en: string; ko: string };

export const LANDING_SEO = {
  title: {
    ko: "WallPilot Pro — 데이터 기반 퀀트 주식 분석 | 수급·재무·적정가",
    en: "WallPilot Pro — Quant Stock Analysis | Supply, Fundamentals, Fair Value",
  } satisfies L,
  description: {
    ko: "AI와 월가 퀀트 방식으로 거래량·세력 수급·재무·뉴스를 분석. 한·미 주식 Reverse-Quant 스캐너. 투자 참고 정보 제공.",
    en: "AI + Wall Street quant logic: volume, institutional flow, fundamentals, and news for KR & US stocks. Reference analysis only.",
  } satisfies L,
  keywords: {
    ko: "주식분석, 퀀트투자, 수급분석, 적정가, 13F, AI주식, 토스증권",
    en: "stock analysis, quant investing, supply demand, fair value, 13F, AI stocks",
  } satisfies L,
};

export const LANDING_HERO = {
  eyebrow: {
    ko: "Reverse-Quant · KR · US",
    en: "Reverse-Quant · KR · US",
  } satisfies L,
  headline: {
    ko: "월가 퀀트 방식으로 읽는 주식 — 수급·재무·적정가를 한 화면에",
    en: "Wall Street quant logic for your portfolio — supply, fundamentals, fair value in one view",
  } satisfies L,
  subhead: {
    ko: "WallPilot Pro는 AI와 데이터로 거래량·세력 수급·재무제표·뉴스를 종합 분석하고, 적정가·매수 관심 구간·리스크를 참고 정보로 제공하는 분석 플랫폼입니다.",
    en: "WallPilot Pro combines AI with market data: volume spikes, institutional flow, financials, and news — delivered as reference analysis, not investment advice.",
  } satisfies L,
  ctaPrimary: {
    ko: "무료로 스캐너 미리보기",
    en: "Preview scanner free",
  } satisfies L,
  ctaSecondary: {
    ko: "요금제 보기",
    en: "View pricing",
  } satisfies L,
};

export const LANDING_VALUE_PROPS = [
  {
    icon: "chart" as const,
    title: {
      ko: "Reverse-Quant 스캔",
      en: "Reverse-Quant Scan",
    },
    body: {
      ko: "13F·퀀트·거래량 필터로 “지금 주목할 종목” 후보를 데이터로 추립니다",
      en: "13F, quant, and volume filters surface candidates worth watching now",
    },
  },
  {
    icon: "flow" as const,
    title: {
      ko: "수급·세력 흐름",
      en: "Supply & Flow",
    },
    body: {
      ko: "외국인·기관 순매수, 거래량 이상, 공급/수요 추세를 차트와 함께 확인",
      en: "Foreign and institutional net buying, volume anomalies, and supply/demand trends",
    },
  },
  {
    icon: "ai" as const,
    title: {
      ko: "AI 월가 리포트",
      en: "AI Wall St. Report",
    },
    body: {
      ko: "Lynch·Greenblatt식 가치평가 + AI 해석으로 적정가·관심 구간·뉴스 맥락 제공",
      en: "Lynch/Greenblatt-style valuation plus AI narrative: fair value, zones, news context",
    },
  },
];

export const LANDING_STEPS = [
  {
    step: "①",
    title: { ko: "스캔", en: "Scan" },
    body: {
      ko: "한·미 종목 유니버스에서 거래량·퀀트·13F 조건 충족 종목 발견",
      en: "Find KR/US names matching volume, quant, and 13F criteria",
    },
  },
  {
    step: "②",
    title: { ko: "분석", en: "Analyze" },
    body: {
      ko: "재무·수급·뉴스·기술적 지표를 종합 → 적정가·Buying Zone 산출",
      en: "Blend fundamentals, flow, news, and technicals → fair value & buying zone",
    },
  },
  {
    step: "③",
    title: { ko: "실행", en: "Execute" },
    body: {
      ko: "(Elite) 토스증권 API 연동으로 내 계좌에서 확인·주문 워크플로",
      en: "(Elite) Toss Securities API workflow for account check and orders",
    },
  },
];

export const LANDING_FAQ = [
  {
    q: {
      ko: "WallPilot은 투자자문인가요?",
      en: "Is WallPilot investment advice?",
    },
    a: {
      ko: "아닙니다. WallPilot Pro는 투자 참고용 정보·분석 도구이며, 개별 투자 판단과 손실 책임은 이용자에게 있습니다.",
      en: "No. WallPilot Pro provides reference information and analysis tools. You are solely responsible for investment decisions and losses.",
    },
  },
  {
    q: {
      ko: "“매수·매도” 신호를 주나요?",
      en: "Does it give buy/sell signals?",
    },
    a: {
      ko: "적정가·관심 구간·리스크 시나리오를 데이터와 AI로 제공합니다. 일률적 매매 지시가 아닙니다.",
      en: "We provide fair value, interest zones, and risk scenarios — not uniform trade instructions.",
    },
  },
  {
    q: {
      ko: "한국·미국 주식 모두 되나요?",
      en: "Does it cover KR and US stocks?",
    },
    a: {
      ko: "스캔·리포트는 KR/US를 지원합니다. DART·토스는 한국 상장·토스증권 연동 시 활용 가능합니다.",
      en: "Scan and reports support KR and US. DART and Toss features apply to KR listings and Toss-linked accounts.",
    },
  },
  {
    q: {
      ko: "AI 답변을 믿어도 되나요?",
      en: "Can I trust AI answers?",
    },
    a: {
      ko: "AI는 보조 해석 도구입니다. 공시·재무 수치는 원문(DART·증권사 API)과 반드시 교차 확인하세요.",
      en: "AI is a helper. Always cross-check filings and figures against primary sources (DART, broker APIs).",
    },
  },
  {
    q: {
      ko: "무료로 무엇을 쓸 수 있나요?",
      en: "What's free?",
    },
    a: {
      ko: "Google 로그인 후 스캐너 미리보기와 시그널 허브 열람이 가능합니다.",
      en: "After Google sign-in: scanner preview and Signal Hub access.",
    },
  },
];

export const LEGAL_DISCLAIMER_KO = `WallPilot Pro™는 Terrabridge Capital Inc.의 독점 소프트웨어입니다.

본 서비스는 투자자문업·투자일임업·집합투자업에 해당하지 않으며, 금융투자업법상 투자권유·투자자문·투자일임을 목적으로 하지 않습니다.

제공되는 모든 분석·적정가·수급 정보·AI 생성 텍스트는 참고용이며, 투자 결정 및 그 결과에 대한 책임은 전적으로 이용자에게 있습니다.

과거 데이터·모델 결과는 미래 수익을 보장하지 않습니다.`;

export const LEGAL_DISCLAIMER_EN = `WallPilot Pro™ is proprietary software of Terrabridge Capital Inc.
Not investment advice. Not a registered investment adviser or broker-dealer.
Past performance does not guarantee future results. You are solely responsible for your investment decisions.`;
