import { useState } from "react";
import { MessageCircle, Scale, Send, UserRound } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { DartLabAnalysis } from "@/lib/modules/dart/types";
import { cn } from "@/lib/utils";

type ConsultMessage = { role: "cpa" | "user"; text: string };

const QUICK_TOPICS_KO = [
  "부채비율이 높으면 위험한가요?",
  "영업이익률이 줄었는데 투자해도 될까요?",
  "유동비율과 ROE를 같이 봐야 하나요?",
  "공시만 보고 매수해도 되나요?",
];

function buildCpaReply(topic: string, result: DartLabAnalysis | null, t: (k: string) => string): string {
  const name = result?.corpName ?? "해당 기업";
  const debt = result?.metricHealth.debtRatio;
  const roe = result?.metricHealth.roe;
  const op = result?.metricHealth.operatingMargin;

  if (topic.includes("부채")) {
    const grade = debt?.grade ?? "na";
    return t("dart_cpa_reply_debt")
      .replace("{name}", name)
      .replace("{pct}", debt?.value != null ? `${debt.value.toFixed(1)}%` : "-")
      .replace("{grade}", grade);
  }
  if (topic.includes("영업이익")) {
    return t("dart_cpa_reply_margin")
      .replace("{name}", name)
      .replace("{pct}", op?.value != null ? `${op.value.toFixed(1)}%` : "-");
  }
  if (topic.includes("유동") || topic.includes("ROE")) {
    return t("dart_cpa_reply_liquidity_roe")
      .replace("{name}", name)
      .replace("{roe}", roe?.value != null ? `${roe.value.toFixed(1)}%` : "-");
  }
  return t("dart_cpa_reply_general").replace("{name}", name);
}

export function DartCpaConsultation({ result }: { result: DartLabAnalysis | null }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ConsultMessage[]>([
    { role: "cpa", text: t("dart_cpa_welcome") },
  ]);
  const [draft, setDraft] = useState("");

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "cpa", text: buildCpaReply(q, result, t) },
    ]);
    setDraft("");
  };

  return (
    <section className="rounded-2xl border border-rose-200/80 bg-gradient-to-b from-rose-50/40 to-white p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold">{t("dart_cpa_consult_title")}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("dart_cpa_consult_sub")}</p>
        </div>
      </div>

      <div className="mb-3 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-hairline bg-white p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex gap-2 text-sm leading-relaxed", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "cpa" ? (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <UserRound className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <p
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2",
                m.role === "cpa" ? "bg-rose-50 text-foreground" : "bg-primary text-primary-foreground",
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_TOPICS_KO.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="rounded-full border border-hairline bg-white px-3 py-1 text-[11px] text-muted-foreground hover:border-rose-300 hover:text-rose-800"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask(draft);
            }}
            placeholder={t("dart_cpa_input_placeholder")}
            className="w-full rounded-xl border border-hairline bg-white py-2.5 pl-9 pr-3 text-sm focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-100"
          />
        </div>
        <button
          type="button"
          onClick={() => ask(draft)}
          className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          <Send className="h-4 w-4" />
          {t("dart_cpa_send")}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{t("dart_cpa_disclaimer")}</p>
    </section>
  );
}
