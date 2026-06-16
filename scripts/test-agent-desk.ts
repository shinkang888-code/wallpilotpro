/**
 * Agent Desk / TradingAgents pipeline verification.
 */
import assert from "node:assert/strict";

import { buildDeepAgentReport } from "../src/lib/agents/deep-report.server";
import {
  buildAnalystReports,
  renderTradingAgentsMarkdown,
  runTradingAgentsPipeline,
} from "../src/lib/agents/tradingagents-pipeline.server";
import { buildWallStreetReportContext } from "../src/lib/quant/wall-street-report.server";

console.log("Agent Desk / TradingAgents tests\n");

const ctx = await buildWallStreetReportContext("NVDA");
assert.equal(ctx.report.ticker, "NVDA");
assert.ok(ctx.report.price > 0);

const analysts = await buildAnalystReports(ctx);
assert.ok(analysts.market.length > 40);
assert.ok(analysts.fundamentals.length > 40);
assert.ok(analysts.news.length > 10);
assert.ok(analysts.sentiment.length > 10);

const pipeline = await runTradingAgentsPipeline(ctx);
assert.ok(pipeline.debate.bullCase.length > 10);
assert.ok(pipeline.debate.bearCase.length > 10);
assert.ok(["Buy", "Hold", "Sell"].includes(pipeline.trader.action));
assert.ok(pipeline.portfolio.executiveSummary.length > 10);
assert.ok(pipeline.markdown.includes("TradingAgents Desk Report"));
assert.ok(pipeline.markdown.includes("Portfolio Manager Decision"));

const md = renderTradingAgentsMarkdown({
  ticker: "NVDA",
  name: "NVIDIA",
  analysts,
  debate: pipeline.debate,
  trader: pipeline.trader,
  riskGate: pipeline.riskGate,
  portfolio: pipeline.portfolio,
});
assert.ok(md.includes("**Rating**"));

const report = await buildDeepAgentReport("NVDA");
assert.equal(report.ticker, "NVDA");
assert.ok(report.markdown.length > 200);
assert.ok(report.markdownKo.length > 200);
assert.ok(report.debate.bullCase.length > 10);
assert.ok(report.riskGate.reason.length > 5);
assert.equal(report.source, "wallpilot-ts");

console.log(`✓ NVDA report: ${report.rating} · ${report.source} · ${report.markdown.length} chars`);

console.log("\n✓ All Agent Desk checks passed");
