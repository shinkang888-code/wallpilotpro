import { fetchGroundedQuotes, renderGroundedBlock } from "@/lib/api/ai-pilot-grounding.server";

async function check(msg: string, ctx: any = null) {
  console.log("\n=== " + msg + " ===");
  const q = await fetchGroundedQuotes(msg, ctx);
  console.log(`resolved ${q.length}:`, q.map((x) => `${x.name}(${x.ticker})`).join(", "));
}

await check("삼성전자 지금 주가 어때? AAPL도 같이 봐줘");
await check("NVDA, TSLA 비교해줘");
await check("005930 분석");
await check("엔비디아 매수타이밍 어때?");
await check("그냥 단기 추천 5개 줘"); // no company mentioned → 0 resolved
