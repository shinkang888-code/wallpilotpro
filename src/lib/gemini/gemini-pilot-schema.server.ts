/** JSON schema for Gemini structured output (AI Pilot). */
export const AI_PILOT_GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    prose: { type: "STRING" },
    intent: {
      type: "STRING",
      enum: ["stock_picks", "ranking", "strategy", "explain", "general", "single_stock"],
    },
    picks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          rank: { type: "INTEGER" },
          ticker: { type: "STRING" },
          name: { type: "STRING" },
          market: { type: "STRING", enum: ["KR", "US"] },
          price_band: { type: "STRING" },
          entry_band: { type: "STRING" },
          stop_loss: { type: "STRING" },
          target_price: { type: "STRING" },
          catalyst_timeline: { type: "STRING" },
          thesis: { type: "STRING" },
          cash_flow_note: { type: "STRING" },
          match_points: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["ticker"],
      },
    },
    ranking_note: { type: "STRING" },
    action_plan: {
      type: "OBJECT",
      properties: {
        aggressive: { type: "STRING" },
        conservative: { type: "STRING" },
      },
      required: ["aggressive", "conservative"],
    },
    deep_analysis: {
      type: "OBJECT",
      properties: {
        ticker: { type: "STRING" },
        name: { type: "STRING" },
        market: { type: "STRING", enum: ["KR", "US"] },
        price_now: { type: "STRING" },
        range_52w: { type: "STRING" },
        analyst_target: { type: "STRING" },
        volatility_drivers: { type: "ARRAY", items: { type: "STRING" } },
        reverse_check: { type: "ARRAY", items: { type: "STRING" } },
        ascii_chart: { type: "STRING" },
        trade_setup: {
          type: "OBJECT",
          properties: {
            entry_zone: { type: "STRING" },
            stop_loss: { type: "STRING" },
            short_target: { type: "STRING" },
            mid_target: { type: "STRING" },
            long_target: { type: "STRING" },
          },
          required: ["entry_zone", "stop_loss", "short_target", "mid_target", "long_target"],
        },
        final_verdict: { type: "STRING" },
      },
      required: [
        "ticker",
        "name",
        "market",
        "price_now",
        "range_52w",
        "analyst_target",
        "volatility_drivers",
        "reverse_check",
        "ascii_chart",
        "trade_setup",
        "final_verdict",
      ],
    },
    follow_ups: { type: "ARRAY", items: { type: "STRING" } },
    disclaimer: { type: "STRING" },
  },
  required: ["headline", "prose"],
} as const;

export const GEMINI_PILOT_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
] as const;
