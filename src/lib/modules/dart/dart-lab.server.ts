import {
  computeDartMetrics,
  fetchDartCompany,
  fetchDartDisclosures,
  fetchDartFinancials,
  fetchExternalDartLabContext,
  isOpenDartConfigured,
} from "@/lib/modules/dart/opendart.server";
import { buildDartContextMarkdown } from "@/lib/modules/dart/dart-context.server";
import { explainDartWithAi } from "@/lib/modules/dart/dart-analyze.server";
import { gradeDartMetrics } from "@/lib/modules/dart/dart-metrics-health.server";
import type { DartLabAnalysis } from "@/lib/modules/dart/types";

export async function runDartLabAnalysis(
  stockCodeInput: string,
  geminiApiKey?: string | null,
): Promise<DartLabAnalysis> {
  const stockCode = stockCodeInput.replace(/\D/g, "").padStart(6, "0").slice(-6);
  if (!/^\d{6}$/.test(stockCode)) throw new Error("dart_invalid_stock_code");
  if (!isOpenDartConfigured()) throw new Error("opendart_not_configured");

  const [profile, disclosures, financials, sidecarContext] = await Promise.all([
    fetchDartCompany(stockCode),
    fetchDartDisclosures(stockCode),
    fetchDartFinancials(stockCode),
    fetchExternalDartLabContext(stockCode),
  ]);

  const metrics = computeDartMetrics(financials);
  const metricHealth = gradeDartMetrics(metrics);
  const contextMarkdown = buildDartContextMarkdown({
    profile,
    disclosures,
    financials,
    metrics,
    metricHealth,
    sidecarContext,
  });

  const ai = await explainDartWithAi(contextMarkdown, profile.corpName, metricHealth, geminiApiKey);

  return {
    stockCode,
    corpName: profile.corpName,
    profile,
    disclosures,
    financials,
    metrics,
    metricHealth,
    contextMarkdown,
    explanationMarkdown: ai.markdown,
    aiMode: ai.aiMode,
    aiSource: ai.aiSource,
    source: sidecarContext ? "dartlab-ms" : "opendart",
    analyzedAt: new Date().toISOString(),
  };
}
