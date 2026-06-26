import {
  fetchDeepStockProfile,
  fetchGroundedQuotes,
  renderDeepProfileBlock,
  renderGroundedBlock,
} from "@/lib/api/ai-pilot-grounding.server";
import { enrichAiPilotPicks } from "@/lib/ai-pilot/yahoo-pick-metrics.server";
import { runDualTrackAiPilot } from "@/lib/ai/ai-pilot-engine.server";
import type { AiPilotPick, AiPilotResponse } from "@/lib/types/ai-pilot";
import type { StockRow } from "@/lib/types/stock";

const KR_DEMO_PICKS: AiPilotPick[] = [
  {
    rank: 1,
    ticker: "036930",
    name: "주성엔지니어링",
    market: "KR",
    priceBand: "29,000~32,000원",
    entryBand: "29,500~31,500원",
    stopLoss: "27,000원",
    targetPrice: "39,000원",
    catalystTimeline: "1~2주",
    thesis: "ALD 장비 수주 + 인적분할 스핀오프 리레이팅 임박",
    cashFlowNote: "순현금 2,500억+ · 부채비율 30% 미만",
    matchPoints: ["극심한 소외", "AI/HBM 인프라", "스핀오프 촉매"],
  },
  {
    rank: 2,
    ticker: "101490",
    name: "에스앤에스텍",
    market: "KR",
    priceBand: "35,000~38,000원",
    entryBand: "34,500~36,500원",
    stopLoss: "32,000원",
    targetPrice: "46,000원",
    catalystTimeline: "2~3주",
    thesis: "EUV 펠리클 Qual 통과 — 숏스퀴즈 탄력 1위",
    cashFlowNote: "삼성전자 지분 + 순현금 버퍼",
    matchPoints: ["악성 매물 소진", "EUV 국산화", "단기 폭등 셋업"],
  },
  {
    rank: 3,
    ticker: "007660",
    name: "이수페타시스",
    market: "KR",
    priceBand: "41,000~44,000원",
    entryBand: "40,500~42,500원",
    stopLoss: "38,000원",
    targetPrice: "54,000원",
    catalystTimeline: "3주",
    thesis: "마벨·엔비디아 네트워킹 갭메우기 + 4공장 풀가동",
    cashFlowNote: "MLB 풀가동 분기 현금 유입",
    matchPoints: ["박스권 소외", "AI 네트워킹", "가동률 100%"],
  },
  {
    rank: 4,
    ticker: "140860",
    name: "파크시스템스",
    market: "KR",
    priceBand: "150,000~165,000원",
    entryBand: "153,000~161,000원",
    stopLoss: "142,000원",
    targetPrice: "195,000원",
    catalystTimeline: "3~4주",
    thesis: "유리기판 검사 AFM 독점 — TSMC/인텔 수주 임박",
    cashFlowNote: "무차입급 1,200억 순현금 · OPM 25~30%",
    matchPoints: ["200일선 지지", "유리기판 테마", "장비 수주"],
  },
  {
    rank: 5,
    ticker: "079550",
    name: "LIG넥스원",
    market: "KR",
    priceBand: "160,000~175,000원",
    entryBand: "162,000~170,000원",
    stopLoss: "151,000원",
    targetPrice: "210,000원",
    catalystTimeline: "4주",
    thesis: "수주잔고 19조+ 방패 — 중동 본계약·2Q 가이드",
    cashFlowNote: "확정 수주 기반 다년 FCF",
    matchPoints: ["눌림목 완료", "K-방산·드론", "기관 재매집"],
  },
];

function demoFallback(userMessage: string, lang: "ko" | "en"): AiPilotResponse {
  const isRanking = /순서|순위|랭킹|rank/i.test(userMessage);
  const picks = [...KR_DEMO_PICKS];
  if (!isRanking) {
    picks.sort((a, b) => a.rank - b.rank);
  }

  const directAnswer =
    lang === "ko"
      ? "데모 모드입니다. WallPilot AI 키를 연동하면 실제 WallPilot AI 품질의 직접 답변 + 월가 형식 분석을 받을 수 있습니다."
      : "Demo mode. Connect a WallPilot AI key for live direct answers plus Wall St. formatted analysis.";

  return {
    directAnswer,
    headline:
      lang === "ko"
        ? "역설계 TOP 5 — 단기 촉매·현금흐름 기준 (데모)"
        : "Reverse-Quant TOP 5 — catalyst & cash-flow ranked (demo)",
    prose:
      lang === "ko"
        ? "WallPilot AI 키가 없어 데모 응답입니다. My API에서 키를 저장하세요.\n\n5종목 모두 금고형 재무 + 소외 구간에서 촉매가 임박한 턴어라운드 후보입니다."
        : "Demo mode without a WallPilot AI key. Save your key on My API for live analysis.",
    intent: isRanking ? "ranking" : "stock_picks",
    picks,
    rankingNote: isRanking
      ? lang === "ko"
        ? "촉매 임박성 → 숏스퀴즈 탄력 → 미국 갭메우기 → 장비 순환매 → 방산 대형주 순"
        : "Catalyst urgency → squeeze elasticity → US gap-fill → equipment rotation → defense large-cap"
      : undefined,
    actionPlan: {
      aggressive:
        lang === "ko"
          ? "1~2주 승부: 주성엔지니어링 + 에스앤에스텍 집중"
          : "1–2 week trades: concentrate on #1 and #2",
      conservative:
        lang === "ko"
          ? "정석: 이수페타시스 눌림목 분할 + LIG넥스원 방패"
          : "Core: scale into #3 on dips + #5 as portfolio shield",
    },
    followUps:
      lang === "ko"
        ? [
            "위 종목 중 단기 상승 가능한 순서로",
            "단기 회전율 높은 종목에 자금 집중 배분 가이드",
            "미국 AI 인프라 연동 국내 수혜주 3개",
          ]
        : ["Rank by near-term upside", "Aggressive vs conservative allocation", "US AI infra KR beneficiaries"],
    disclaimer:
      lang === "ko"
        ? "연구 목적이며 투자 조언이 아닙니다."
        : "For research only — not investment advice.",
  };
}

export async function runAiPilotChat(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lang: "ko" | "en";
  scanContext?: { shortSqueeze: StockRow[]; highCash: StockRow[] } | null;
  geminiApiKey?: string | null;
  tossKey?: string | null;
}): Promise<AiPilotResponse> {
  const latest = input.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const grounded = await fetchGroundedQuotes(latest, input.scanContext, 4, {
    tossKey: input.tossKey,
  }).catch(() => []);
  const groundedBlock = renderGroundedBlock(grounded);

  const singleStockSignal =
    /분석|리포트|deep|analysis|report|breakdown|주가|시세|타점|매수|매도|target|price|setup/i.test(
      latest,
    );
  let deepBlock = "";
  let deepProfile: Awaited<ReturnType<typeof fetchDeepStockProfile>> | null = null;
  if (grounded.length === 1 && (singleStockSignal || latest.trim().length <= 30)) {
    deepProfile = await fetchDeepStockProfile(grounded[0]).catch(() => null);
    if (deepProfile) deepBlock = renderDeepProfileBlock(deepProfile);
  }

  const result = await runDualTrackAiPilot({
    messages: input.messages,
    lang: input.lang,
    scanContext: input.scanContext,
    groundedBlock,
    deepBlock,
    geminiApiKey: input.geminiApiKey,
  });

  if (result.ok) {
    const liveQuotes = grounded.map((q) => ({
      ticker: q.ticker,
      name: q.name,
      market: q.market,
      currency: q.currency,
      price: q.price,
      change30dPct: q.change30dPct,
      peRatio: q.peRatio,
      roe: q.roe,
    }));
    const liveChart =
      deepProfile && deepProfile.closes6mo.length > 0
        ? {
            ticker: deepProfile.quote.ticker,
            name: deepProfile.quote.name,
            market: deepProfile.quote.market,
            currency: deepProfile.quote.currency,
            closes: deepProfile.closes6mo,
            high52w: deepProfile.high52w,
            low52w: deepProfile.low52w,
            targetMean: deepProfile.targetMean,
            priceNow: deepProfile.quote.price,
          }
        : undefined;
    const picks = await enrichAiPilotPicks(result.data.picks, input.lang);
    return {
      ...result.data,
      picks,
      liveQuotes: liveQuotes.length > 0 ? liveQuotes : undefined,
      liveChart,
    };
  }

  if (result.reason === "no_key") {
    return demoFallback(latest, input.lang);
  }

  if (result.reason === "parse_error") {
    return {
      directAnswer:
        input.lang === "ko"
          ? "WallPilot AI 응답 파싱에 실패했습니다. 질문을 조금 더 구체적으로 다시 시도해 주세요."
          : "WallPilot AI response parsing failed. Try a more specific question.",
      headline: input.lang === "ko" ? "분석 일시 중단" : "Analysis paused",
      prose: result.detail ?? "",
      intent: "general",
      followUps: [],
      disclaimer:
        input.lang === "ko" ? "연구 목적이며 투자 조언이 아닙니다." : "For research only — not investment advice.",
    };
  }

  throw new Error(`gemini_error:${result.reason}:${result.detail ?? ""}`);
}
