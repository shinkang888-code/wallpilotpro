import type { AppLocale } from "@/lib/i18n/constants";
import type { DeepAgentReport } from "@/lib/types/stock";

export type AgentDeskDisplayContent = Pick<
  DeepAgentReport,
  "analysts" | "debate" | "trader" | "riskGate" | "portfolio" | "markdown" | "markdownKo"
>;

export function pickAgentDeskContent(report: DeepAgentReport, lang: AppLocale): AgentDeskDisplayContent {
  const ko = report.localizedKo;
  if (lang === "ko" && ko) {
    return {
      analysts: ko.analysts,
      debate: ko.debate,
      trader: ko.trader,
      riskGate: ko.riskGate,
      portfolio: ko.portfolio,
      markdown: report.markdownKo || report.markdown,
      markdownKo: report.markdownKo,
    };
  }
  return {
    analysts: report.analysts,
    debate: report.debate,
    trader: report.trader,
    riskGate: report.riskGate,
    portfolio: report.portfolio,
    markdown: report.markdown,
    markdownKo: report.markdownKo,
  };
}
