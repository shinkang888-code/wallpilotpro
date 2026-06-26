import type { DeepAgentReport } from "@/lib/types/stock";

const baseReport = {
  ticker: "NVDA",
  name: "NVIDIA",
  market: "US" as const,
  currency: "USD" as const,
  price: 142.5,
  generatedAt: new Date().toISOString(),
  lynch: {
    fairValue: 168,
    pegRatio: 1.2,
    dividendAdjustedPEG: 1.15,
    lynchScore: 82,
    companyType: "Fast Grower",
    recommendation: "Strong growth at reasonable PEG",
    upsidePct: 17.9,
  },
  greenblatt: {
    fairValue: 155,
    roic: 42.1,
    earningsYield: 3.8,
    magicScore: 91,
    comprehensiveScore: 88,
    investmentGrade: "A",
    recommendation: "High ROIC compounder",
    upsidePct: 8.8,
  },
  supply: {
    foreignNetAmount: null,
    institutionNetAmount: null,
    trend: "accumulating" as const,
    label: "기관 순매수 · AI CAPEX 테마",
  },
  combined: {
    fairValue: 162,
    marginOfSafetyPct: 12.1,
    buyingZone: "128 – 138",
    profitTarget: "168 – 185",
    hardStop: "118",
    recommendation: "AI 데이터센터 사이클 Overweight",
  },
  catalysts: ["Blackwell 출하", "하이퍼스케일러 CAPEX", "마진 확대"],
  rating: "Overweight" as const,
  technicalLabel: "상승 추세 · RSI 중립",
};

const localizedKo = {
  analysts: {
    market:
      "NVDA는 $142.5에 거래 중이며 30일 모멘텀은 +8.2%입니다. 50일 이동평균선 위에서 기술적 구조가 양호하고, 조정 구간에서 기관 매수세가 동반되는 모습입니다.",
    fundamentals:
      "데이터센터 매출 비중 85% 이상, 마진 확대 지속. PEG 1.2배로 AI 동종업체 중위 1.8배 대비 합리적입니다. ROE·영업 레버리지 퀀트 스크린 통과.",
    news:
      "차세대 GPU 출하와 클라우드 CAPEX 가이던스가 주요 헤드라인입니다. 최근 세션에서 중대한 규제 리스크는 확인되지 않았습니다.",
    sentiment:
      "뉴스·소셜 심리는 낙관적이나 과열 구간은 아닙니다. 수급 라벨: 순매집. 데스크 종합 뷰는 약세 구간 분할 매수를 지지합니다.",
  },
  debate: {
    bullCase:
      "AI 인프라 투자는 아직 초기 단계입니다. NVDA는 CUDA 생태계와 가격 결정력을 유지하며, 안전마진 10% 이상과 Overweight 퀀트 정렬이 뒷받침됩니다.",
    bearCase:
      "밸류에이션에 완벽한 기대가 반영되어 있습니다. CAPEX 일시 중단이나 커스텀 ASIC 점유 확대 시 멀티플 압축 가능성이 있습니다.",
    verdict:
      "리서치 매니저: 1~3개월 관점에서 위험·수익 비율은 긍정적 — Overweight 유지, 분할·규율적 비중 권고.",
    rating: "Overweight" as const,
  },
  trader: {
    action: "Buy" as const,
    reasoning: "매수 구간으로의 되돌림은 유리한 진입 기회입니다. 모멘텀과 펀더멘털이 리서치 Overweight와 일치합니다.",
    entryPrice: 138,
    stopLoss: 118,
    positionSizing: "종목당 포트폴리오 2~3%",
  },
  riskGate: {
    approved: true,
    reason: "리스크 점검 통과 — 집중도 가드레일 내 비중.",
    aggressiveView: "AI CAPEX 사이클이 다음 실적 시즌까지 상방 편향을 연장할 수 있습니다.",
    conservativeView: "118 손절로 하방을 제한 — 모니터링 하에 승인.",
  },
  portfolio: {
    rating: "Overweight" as const,
    executiveSummary: "Overweight — AI 데이터센터 리더, 수용 가능한 안전마진. 리스크 게이트 통과.",
    investmentThesis:
      "가속 컴퓨팅 분야 선두와 지속 가능한 소프트웨어 생태계. 매수 구간 내 분할 진입 선호.",
    priceTarget: 168,
    timeHorizon: "1~3개월",
  },
};

export const AGENT_DESK_DEMO_REPORT: DeepAgentReport = {
  ...baseReport,
  analysisDate: new Date().toISOString().slice(0, 10),
  source: "tradingagents-ms",
  analysts: localizedKo.analysts,
  debate: localizedKo.debate,
  trader: localizedKo.trader,
  riskGate: localizedKo.riskGate,
  portfolio: localizedKo.portfolio,
  localizedKo,
  markdown: "# NVIDIA (NVDA) — TradingAgents Demo Report\n\n## Market Analyst\nDemo pipeline output.",
  markdownKo: `# NVIDIA (NVDA) — TradingAgents 데모 리포트

## 종합 요약
현재가 $142.5, 내재가치 추정 $162 기준 안전마진 12.1%. AI 데이터센터 사이클 Overweight.

## Analyst 팀
시장·펀더멘털·뉴스·심리 4개 관점에서 NVDA를 점검한 데모 리포트입니다.

※ 실제 분석은 **실행** 탭에서 **에이전트 분석 실행**을 사용하세요.`,
};
