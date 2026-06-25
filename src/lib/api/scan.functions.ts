import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { debateTopPicks } from "@/lib/agents/debate.server";
import { geminiAnalyzeStock } from "@/lib/api/gemini-analyze.server";
import { fetchNewsHeadlines } from "@/lib/api/news-data.server";
import { enrichMarketBatch } from "@/lib/api/market-enrichment.server";
import { fetchMarketBatch } from "@/lib/api/market-data.server";
import { logDecisionBatch } from "@/lib/db/decision-log.server";
import { classifyRows, type AnalyzedRow } from "@/lib/quant/classify.server";
import { rankCandidates } from "@/lib/quant/screener.server";
import { calculateValuation } from "@/lib/quant/valuation.server";
import { buildUniverse } from "@/lib/quant/universe.server";
import { ratingScore } from "@/lib/types/rating";
import type { TradingPayload } from "@/lib/types/stock";
import { fetchTossWallet } from "@/lib/api/toss-bridge.server";
import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { guardFeature } from "@/lib/auth/guard-auth.server";

const scanInput = z.object({
  toggles: z.object({
    toss: z.boolean(),
    thirteenF: z.boolean(),
    quant: z.boolean(),
  }),
  tossKey: z.string().nullable(),
  accessToken: z.string().nullable().optional(),
  ...clientGeminiKeySchema.shape,
});

export const scanReverseQuant = createServerFn({ method: "POST" })
  .inputValidator(scanInput)
  .handler(async ({ data }): Promise<TradingPayload> => {
    const authSession = await guardFeature(data.accessToken, "scan");
    const universe = buildUniverse(data.toggles);
    const snapshots = await enrichMarketBatch(
      await fetchMarketBatch(universe, { tossKey: data.tossKey }),
    );
    const ranked = rankCandidates(snapshots);

    if (ranked.length === 0) {
      throw new Error("No market data available. Check network or ticker symbols.");
    }

    const newsByTicker = new Map<string, Awaited<ReturnType<typeof fetchNewsHeadlines>>>();

    const analyzed: AnalyzedRow[] = await Promise.all(
      ranked.map(async (snapshot) => {
        const valuation = calculateValuation(snapshot);
        const news = await fetchNewsHeadlines(snapshot.ticker, snapshot.market, 5);
        newsByTicker.set(snapshot.ticker, news);
        const gemini = await geminiAnalyzeStock(snapshot, valuation, {
          news,
          geminiApiKey: data.geminiApiKey,
        });
        const catalysts = [
          ...gemini.bull_catalysts,
          ...(gemini.news_takeaway ? [`News: ${gemini.news_takeaway}`] : []),
          ...gemini.bear_risks.map((r) => `Risk: ${r}`),
        ];
        return {
          snapshot,
          valuation,
          catalysts: catalysts.slice(0, 4),
          rating: gemini.rating,
        };
      }),
    );

    const topForDebate = [...analyzed]
      .sort((a, b) => ratingScore(b.rating) - ratingScore(a.rating))
      .slice(0, 5);
    const debateMap = await debateTopPicks(
      topForDebate.map((row) => ({
        ticker: row.snapshot.ticker,
        snapshot: row.snapshot,
        valuation: row.valuation,
        news: newsByTicker.get(row.snapshot.ticker) ?? [],
        initialRating: row.rating,
      })),
      5,
      data.geminiApiKey,
    );

    const enriched = analyzed.map((row) => {
      const debate = debateMap.get(row.snapshot.ticker);
      if (!debate) return row;
      return {
        ...row,
        rating: debate.rating,
        debate,
        catalysts: [`Verdict: ${debate.verdict}`, ...row.catalysts].slice(0, 4),
      };
    });

    void logDecisionBatch(
      topForDebate
        .filter((r) => debateMap.has(r.snapshot.ticker))
        .map((r) => {
          const d = debateMap.get(r.snapshot.ticker)!;
          return {
            ticker: r.snapshot.ticker,
            market: r.snapshot.market,
            eventType: "scan" as const,
            rating: d.rating,
            priceAtDecision: r.snapshot.price,
            bullCase: d.bullCase,
            bearCase: d.bearCase,
          };
        }),
    );

    const { shortSqueeze, highCash } = classifyRows(enriched);

    let walletBalance: TradingPayload["walletBalance"] = null;
    if (data.tossKey) {
      walletBalance = await fetchTossWallet(data.tossKey);
    }

    return { shortSqueeze, highCash, walletBalance };
  });
