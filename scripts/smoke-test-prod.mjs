/** Guest smoke test — all nav routes on production. */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "https://wallpilotpro.vercel.app";

const ROUTES = [
  { name: "scanner", path: "/" },
  { name: "wall_report", path: "/wall-street-report" },
  { name: "dartlab", path: "/dartlab" },
  { name: "ai_pilot", path: "/ai-pilot" },
  { name: "agent_desk", path: "/agents/desk" },
  { name: "signals", path: "/signals" },
  { name: "rl_lab", path: "/quant/rl-lab" },
  { name: "toss_trader", path: "/toss-trader" },
  { name: "my_api", path: "/my-api" },
  { name: "pricing", path: "/pricing" },
];

const FAIL_PATTERNS = [
  /404/i,
  /Not Found/i,
  /menu_gate_title/i,
  /Premium/i,
  /Elite/i,
  /Day Trading/i,
  /로그인이 필요/i,
  /Sign in to continue/i,
  /entitlement_required/i,
  /Application error/i,
  /Something went wrong/i,
];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    locale: "ko-KR",
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", (err) => consoleErrors.push({ url: page.url(), text: err.message }));

  const results = [];

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    consoleErrors.length = 0;
    let status = 0;
    let bodyText = "";
    let title = "";
    try {
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(2000);
      title = await page.title();
      bodyText = await page.locator("body").innerText();
    } catch (e) {
      results.push({ ...route, ok: false, status, title, issue: `navigation: ${e.message}`, consoleErrors: [...consoleErrors] });
      continue;
    }

    const issues = [];
    if (status >= 400) issues.push(`HTTP ${status}`);
    for (const pat of FAIL_PATTERNS) {
      if (pat.test(bodyText) && !pat.test("Premium features")) {
        if (pat.source.includes("Premium") && route.path === "/pricing") continue;
        if (pat.source.includes("Day Trading") && route.path === "/pricing") continue;
        if (pat.source.includes("Elite") && route.path === "/pricing") continue;
        issues.push(`matched: ${pat.source}`);
      }
    }
    if (bodyText.includes("menu_gate")) issues.push("menu gate visible");
    const i18nLeaks = bodyText.match(/\b(guru_title|toggle_toss|scan_prompt|showcase_title|nav_[a-z_]+)\b/g);
    if (i18nLeaks?.length) issues.push(`i18n keys: ${[...new Set(i18nLeaks)].slice(0, 5).join(", ")}`);

    results.push({
      ...route,
      ok: issues.length === 0 && status < 400,
      status,
      title,
      issue: issues.join("; ") || null,
      consoleErrors: consoleErrors.slice(0, 5),
    });
  }

  await browser.close();

  console.log(`\n=== Smoke test: ${BASE} ===\n`);
  for (const r of results) {
    console.log(`${r.ok ? "OK" : "FAIL"}  ${r.name.padEnd(14)} ${r.path}  [${r.status}] ${r.issue ?? ""}`);
    if (r.consoleErrors?.length) {
      for (const c of r.consoleErrors) console.log(`       console: ${c.text.slice(0, 120)}`);
    }
  }
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
