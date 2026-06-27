// filepath: scripts/capture-ir-screenshots.mjs
/** Capture WallPilot Pro pages for IR deck (local preview or production). */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets", "ir-screens");
const BASE = process.env.IR_SCREEN_BASE ?? "http://127.0.0.1:4173";

const PAGES = [
  { name: "01-home-landing", path: "/", wait: 2500 },
  { name: "02-scanner", path: "/", wait: 3500, action: async (page) => {
    await page.evaluate(() => document.getElementById("scanner")?.scrollIntoView({ behavior: "instant", block: "start" }));
    await page.waitForTimeout(800);
  }},
  { name: "03-pricing", path: "/pricing", wait: 2000 },
  { name: "04-wall-report", path: "/wall-street-report", wait: 2500 },
  { name: "05-dartlab", path: "/dartlab", wait: 2500 },
  { name: "06-ai-pilot", path: "/ai-pilot", wait: 2500 },
  { name: "07-toss-trader", path: "/toss-trader", wait: 2500 },
  { name: "08-signals", path: "/signals", wait: 2500 },
  { name: "09-my-api", path: "/my-api", wait: 2000 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "ko-KR",
  });
  const page = await ctx.newPage();

  for (const spec of PAGES) {
    const url = `${BASE}${spec.path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(spec.wait);
      if (spec.action) await spec.action(page);
      const file = path.join(OUT, `${spec.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log("OK", file);
    } catch (e) {
      console.warn("SKIP", spec.name, e.message);
    }
  }

  await browser.close();
  console.log("Done:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
