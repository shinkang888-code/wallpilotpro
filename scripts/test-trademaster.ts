/**
 * TradeMaster RL Lab — run: npm run test:trademaster
 */
import {
  metricsFromEquityCurve,
  runQuickBacktest,
  synthesizeEquityFromReturn,
} from "../src/lib/modules/tm/fast-backtest.server.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const quick = runQuickBacktest(["NVDA", "AAPL"]);
  assert(quick.equityCurve.length > 10, "quick curve has points");
  assert(quick.metrics.sharpe !== undefined, "quick sharpe");
  assert(quick.metrics.totalReturnPct !== undefined, "quick return");
  assert(quick.chartNote.includes("Quick scan"), "quick note");

  const curve = synthesizeEquityFromReturn(12.5);
  assert(curve.length === 22, "synthesized curve length");
  const derived = metricsFromEquityCurve(curve, 3);
  assert(derived.totalReturnPct > 10 && derived.totalReturnPct < 15, "derived return ~12.5%");

  console.log("PASS: TradeMaster RL Lab modules OK");
}

main();
