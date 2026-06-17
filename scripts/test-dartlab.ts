/**
 * DARTLAB module tests (no live API required for unit checks).
 */
import assert from "node:assert/strict";

import { resolveCorpCode, resetCorpCodeCacheForTests, normalizeCorpName } from "../src/lib/modules/dart/corp-code.server";
import { computeDartMetrics } from "../src/lib/modules/dart/opendart.server";
import { buildDartContextMarkdown } from "../src/lib/modules/dart/dart-context.server";
import { gradeDartMetrics } from "../src/lib/modules/dart/dart-metrics-health.server";
import { canAccessMenu } from "../src/lib/membership/menu-access";
import { APP_MENUS } from "../src/lib/membership/menus";

console.log("DARTLAB tests\n");

assert.equal(normalizeCorpName("삼성전자(주)"), "삼성전자");
assert.equal(normalizeCorpName("  한국정보공학 "), "한국정보공학");

resetCorpCodeCacheForTests();
const corp = await resolveCorpCode("005930", "");
assert.ok(corp);
assert.equal(corp!.corpCode, "00126380");
assert.equal(corp!.stockCode, "005930");

const metrics = computeDartMetrics({
  bsnsYear: "2023",
  reprtCode: "11011",
  reprtName: "사업보고서",
  fsDiv: "CFS",
  rows: [
    { accountNm: "매출액", currentAmount: 1000, priorAmount: 900, sjDiv: "IS" },
    { accountNm: "영업이익", currentAmount: 100, priorAmount: 80, sjDiv: "IS" },
    { accountNm: "당기순이익", currentAmount: 80, priorAmount: 70, sjDiv: "IS" },
    { accountNm: "자산총계", currentAmount: 5000, priorAmount: 4800, sjDiv: "BS" },
    { accountNm: "부채총계", currentAmount: 2000, priorAmount: 1900, sjDiv: "BS" },
    { accountNm: "자본총계", currentAmount: 3000, priorAmount: 2900, sjDiv: "BS" },
    { accountNm: "유동자산", currentAmount: 1500, priorAmount: 1400, sjDiv: "BS" },
    { accountNm: "유동부채", currentAmount: 1000, priorAmount: 950, sjDiv: "BS" },
  ],
});

assert.equal(metrics.revenue, 1000);
assert.ok(metrics.debtRatio != null && metrics.debtRatio > 60);
assert.ok(metrics.roe != null && metrics.roe > 0);

const md = buildDartContextMarkdown({
  profile: {
    corpCode: "00126380",
    corpName: "삼성전자",
    stockCode: "005930",
    ceoNm: "Test",
  },
  disclosures: [
    {
      rceptNo: "1",
      corpName: "삼성전자",
      stockCode: "005930",
      reportNm: "사업보고서",
      rceptDt: "20240315",
      dartUrl: "https://dart.fss.or.kr",
    },
  ],
  financials: null,
  metrics,
  metricHealth: gradeDartMetrics(metrics),
});

assert.ok(md.includes("삼성전자"));
assert.ok(md.includes("부채비율"));
assert.ok(md.includes("CPA 지표 판정"));

const health = gradeDartMetrics(metrics);
assert.equal(health.debtRatio.grade, "good");
assert.equal(health.roe.grade, "risk");
assert.equal(health.operatingMargin.grade, "good");

const dartMenu = APP_MENUS.find((m) => m.id === "dart_lab");
assert.ok(dartMenu);
assert.equal(dartMenu!.namespace, "dart");
assert.equal(canAccessMenu("dart_lab", "day_trading", "execute"), true);
assert.equal(canAccessMenu("dart_lab", "free", "execute"), false);

console.log("✓ All DARTLAB checks passed");
