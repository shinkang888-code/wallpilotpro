import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    fmpApiKey: process.env.FMP_API_KEY ?? "",
    tossApiBaseUrl:
      process.env.TOSS_API_BASE_URL ?? "https://openapi.tossinvest.com",
    tossClientId: process.env.TOSS_CLIENT_ID ?? "",
    tossClientSecret: process.env.TOSS_CLIENT_SECRET ?? "",
    koreaStockMcpUrl:
      process.env.KOREA_STOCK_MCP_URL ?? "https://korea-stock-analyzer-mcp.vercel.app",
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? "",
    agentServiceUrl:
      process.env.WALLPILOT_AGENT_SERVICE_URL ??
      process.env.TRADINGAGENTS_SERVICE_URL ??
      "",
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    vercelAccessToken: process.env.VERCEL_ACCESS_TOKEN ?? process.env.VERCEL_TOKEN ?? "",
    vercelProjectId: process.env.VERCEL_PROJECT_ID ?? "",
    vercelTeamId: process.env.VERCEL_TEAM_ID ?? "",
    wallpilotSetupSecret: process.env.WALLPILOT_SETUP_SECRET ?? "",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    googleAuthRedirectUri: process.env.GOOGLE_AUTH_REDIRECT_URI ?? "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
    authEnforce: process.env.AUTH_ENFORCE ?? "true",
    /** When true, pending Google sign-ins are auto-activated (plan stays Free unless paid). */
    authAutoApprove: process.env.AUTH_AUTO_APPROVE ?? "false",
    authSiteUrl:
      process.env.AUTH_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8080"),
    bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    stripePriceBasic: process.env.STRIPE_PRICE_BASIC ?? "",
    stripePricePro: process.env.STRIPE_PRICE_PRO ?? "",
    stripePricePremium: process.env.STRIPE_PRICE_PREMIUM ?? "",
    stripePriceElite: process.env.STRIPE_PRICE_ELITE ?? "",
    danalClientId: process.env.DANAL_CLIENT_ID ?? "",
    danalClientSecret: process.env.DANAL_CLIENT_SECRET ?? "",
    danalMerchantId: process.env.DANAL_MERCHANT_ID ?? process.env.DANAL_CLIENT_ID ?? "",
    danalClientKey: process.env.DANAL_CLIENT_KEY ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    signalHubServiceUrl:
      process.env.WALLPILOT_SIGNAL_SERVICE_URL ??
      process.env.AIT_SERVICE_URL ??
      process.env.AI4TRADE_API_BASE ??
      "",
    opendartApiKey: process.env.OPENDART_API_KEY ?? "",
    dartlabServiceUrl: process.env.DARTLAB_SERVICE_URL ?? "",
    rlServiceUrl:
      process.env.WALLPILOT_RL_SERVICE_URL ??
      process.env.TRADEMASTER_SERVICE_URL ??
      "",
    cryptoEngineApiUrl:
      process.env.WALLPILOT_CRYPTO_API_URL ??
      process.env.FREQTRADE_API_URL ??
      "http://127.0.0.1:8080",
    cryptoEngineApiUser:
      process.env.WALLPILOT_CRYPTO_API_USER ?? process.env.FREQTRADE_API_USER ?? "wallpilot",
    cryptoEngineApiPassword:
      process.env.WALLPILOT_CRYPTO_API_PASSWORD ??
      process.env.FREQTRADE_API_PASSWORD ??
      "wallpilot",
  };
}
