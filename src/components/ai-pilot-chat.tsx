import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, MessageSquarePlus, Radar, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AiPilotQuickPromptsDialog } from "@/components/ai-pilot-quick-prompts-dialog";
import { AiPilotPickTable } from "@/components/ai-pilot-pick-table";
import { AiPilotScanResults } from "@/components/ai-pilot-scan-results";
import { AiPilotLiveQuotes, AiPilotLiveChartPanel } from "@/components/ai-pilot-live-panel";
import { chatAiPilot } from "@/lib/api/ai-pilot.functions";
import { useQuickPrompts } from "@/lib/ai-pilot/use-quick-prompts";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n, toAiPilotLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { GeminiKeySourceBadge } from "@/components/gemini-key-source-badge";
import { GeminiSyncStatusBanner } from "@/components/gemini-sync-status-banner";
import {
  geminiErrorI18nKey,
  parseGeminiErrorReason,
} from "@/lib/gemini/gemini-error-i18n";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { useGeminiKeySource } from "@/lib/use-gemini-key-source";
import type { AiPilotMessage, AiPilotResponse } from "@/lib/types/ai-pilot";
import type { StockRow, TradingPayload } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AssistantBody({
  response,
  onFollowUp,
}: {
  response: AiPilotResponse;
  onFollowUp: (text: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {response.directAnswer && (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              {t("pilot_direct_answer_title")}
            </span>
            <span className="text-[10px] text-emerald-900/70">{t("pilot_direct_answer_hint")}</span>
          </div>
          <div
            className={cn(
              "text-sm leading-relaxed text-foreground",
              "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold",
              "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold",
              "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5",
              "[&_strong]:font-bold [&_strong]:text-foreground",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.directAnswer}</ReactMarkdown>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-hairline pb-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {t("pilot_wallstreet_title")}
          </span>
          <span className="text-[10px] text-muted-foreground">{t("pilot_wallstreet_hint")}</span>
        </div>

        <p className="font-display text-sm font-semibold text-foreground">{response.headline}</p>

        {response.liveQuotes && response.liveQuotes.length > 0 && (
          <div className="mt-3">
            <AiPilotLiveQuotes quotes={response.liveQuotes} />
          </div>
        )}
        {response.liveChart && (
          <div className="mt-3">
            <AiPilotLiveChartPanel chart={response.liveChart} />
          </div>
        )}
        <div
          className={cn(
            "mt-2 text-sm leading-relaxed text-foreground",
            "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold",
            "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold",
            "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5",
            "[&_strong]:font-bold [&_strong]:text-foreground",
            "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-hairline [&_pre]:bg-foreground/[0.03] [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-[10px] [&_pre]:leading-tight",
            "[&_code]:rounded [&_code]:bg-foreground/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]",
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.prose}</ReactMarkdown>
        </div>

        {response.deepAnalysis && <DeepAnalysisBlock deep={response.deepAnalysis} />}

        {response.rankingNote && (
          <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
            <span className="font-semibold">{t("pilot_ranking")}: </span>
            {response.rankingNote}
          </p>
        )}

        {response.picks && response.picks.length > 0 && (
          <div className="mt-3">
            <AiPilotPickTable picks={response.picks} />
          </div>
        )}

        {response.actionPlan && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-hairline bg-white p-3 text-xs">
              <p className="font-bold text-positive">{t("risk_aggressive")}</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{response.actionPlan.aggressive}</p>
            </div>
            <div className="rounded-xl border border-hairline bg-white p-3 text-xs">
              <p className="font-bold text-primary">{t("risk_conservative")}</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {response.actionPlan.conservative}
              </p>
            </div>
          </div>
        )}
      </section>

      {response.followUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {response.followUps.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onFollowUp(q)}
              className="rounded-full border border-hairline bg-white px-3 py-1.5 text-left text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">{response.disclaimer}</p>
    </div>
  );
}

function DeepAnalysisBlock({ deep }: { deep: NonNullable<AiPilotResponse["deepAnalysis"]> }) {
  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
        <div>
          <p className="font-display text-base font-bold text-foreground">
            {deep.name}{" "}
            <span className="text-muted-foreground">
              ({deep.ticker} · {deep.market})
            </span>
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-primary">
            Single-Stock Deep Analysis
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono text-sm font-bold text-foreground">{deep.priceNow}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">52W {deep.range52w}</p>
        </div>
      </header>

      <div className="rounded-xl border border-hairline bg-white px-3 py-2 text-[11px] text-foreground">
        <span className="font-semibold text-primary">월가 목표가 · </span>
        {deep.analystTarget}
      </div>

      {deep.volatilityDrivers.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
            📊 변동성 폭발 사유
          </h4>
          <ul className="space-y-1.5 text-xs leading-relaxed text-foreground">
            {deep.volatilityDrivers.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deep.reverseCheck.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
            🔍 역설계 공식 검증
          </h4>
          <ul className="space-y-1.5 text-xs leading-relaxed text-foreground">
            {deep.reverseCheck.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-positive">✓</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deep.asciiChart && (
        <div>
          <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
            📈 가격·수급 차트
          </h4>
          <pre className="overflow-x-auto rounded-xl border border-hairline bg-foreground/[0.02] p-3 font-mono text-[10px] leading-tight text-foreground">
            {deep.asciiChart}
          </pre>
        </div>
      )}

      <div>
        <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
          🛡️ 실전 매매 대응 셋업
        </h4>
        <div className="space-y-1.5 text-xs">
          <SetupRow label="🟢 매수 타점" value={deep.tradeSetup.entryZone} tone="positive" />
          <SetupRow label="🔴 손절가" value={deep.tradeSetup.stopLoss} tone="negative" />
          <SetupRow label="🔵 1개월 단기" value={deep.tradeSetup.shortTarget} tone="primary" />
          <SetupRow label="📈 3~6개월 중기" value={deep.tradeSetup.midTarget} tone="primary" />
          <SetupRow label="🚀 12개월 리레이팅" value={deep.tradeSetup.longTarget} tone="positive" />
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          월가 거인의 최종 권고
        </p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
          {deep.finalVerdict}
        </p>
      </div>
    </section>
  );
}

function SetupRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "primary";
}) {
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-destructive" : "text-primary";
  return (
    <div className="grid grid-cols-[auto,1fr] gap-2 rounded-lg border border-hairline bg-white px-2.5 py-1.5">
      <span className={cn("text-[11px] font-bold whitespace-nowrap", toneClass)}>{label}</span>
      <span className="text-[11px] leading-relaxed text-foreground">{value}</span>
    </div>
  );
}

export function AiPilotChat({
  scanContext,
  scanData,
  scanLoading,
  scanError,
  onRunScan,
}: {
  scanContext?: { shortSqueeze: StockRow[]; highCash: StockRow[] } | null;
  scanData?: TradingPayload | null;
  scanLoading?: boolean;
  scanError?: string | null;
  onRunScan?: () => void;
}) {
  const { t, lang } = useI18n();
  const { accessToken } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const { key: tossKey } = useTossApiKey();
  const geminiKeySource = useGeminiKeySource();
  const [messages, setMessages] = useState<AiPilotMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanTriggered, setScanTriggered] = useState(false);
  const [promptsDialogOpen, setPromptsDialogOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { prompts: quickPrompts, addPrompt, updatePrompt, deletePrompt, resetToDefaults } =
    useQuickPrompts(lang);

  const handleRunScan = useCallback(() => {
    if (!onRunScan || scanLoading) return;
    setScanTriggered(true);
    onRunScan();
  }, [onRunScan, scanLoading]);

  const hasScanResults =
    Boolean(scanData) &&
    ((scanData?.shortSqueeze.length ?? 0) > 0 || (scanData?.highCash.length ?? 0) > 0);

  useEffect(() => {
    if (hasScanResults) setScanTriggered(true);
  }, [hasScanResults]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: AiPilotMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setDraft("");
      setLoading(true);

      try {
        const apiMessages = nextMessages.map((m) => ({
          role: m.role,
          content:
            m.role === "assistant" && m.response
              ? `[Direct]\n${m.response.directAnswer.slice(0, 1200)}\n\n[WallSt]\n${m.response.headline}\n${m.response.prose.slice(0, 600)}`
              : m.content,
        }));

        const response = await chatAiPilot({
          data: {
            accessToken,
            tossKey,
            geminiApiKey: geminiApiKey ?? undefined,
            messages: apiMessages,
            lang: toAiPilotLang(lang),
            scanContext: scanContext ?? null,
          },
        });

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: response.headline,
            response,
            createdAt: Date.now(),
          },
        ]);
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        let content = t("pilot_error");
        const geminiReason = parseGeminiErrorReason(code);
        if (geminiReason) content = t(geminiErrorI18nKey(geminiReason));
        else if (code.startsWith("gemini_error:")) content = t("pilot_gemini_error");
        else if (code.startsWith("entitlement_required:")) content = t("pilot_entitlement");
        else if (
          code === "unauthorized" ||
          code === "account_pending" ||
          code === "account_suspended" ||
          code === "account_deleted" ||
          code === "account_blocked" ||
          code === "auth_not_configured" ||
          code === "missing_service_role" ||
          code === "missing_anon_key"
        ) {
          content = formatFeatureError(code, t);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, lang, scanContext, accessToken, geminiApiKey, tossKey, t],
  );

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col rounded-3xl border border-hairline bg-surface/40">
      {/* Hero strip */}
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">{t("pilot_chat_title")}</h2>
          </div>
          <button
            type="button"
            onClick={() => setPromptsDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            {t("pilot_register_questions")}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("pilot_chat_sub")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <GeminiKeySourceBadge
            source={geminiKeySource.source}
            loading={geminiKeySource.loading}
          />
        </div>
        <GeminiSyncStatusBanner
          className="mt-2"
          loading={geminiKeySource.loading}
          redeployPending={geminiKeySource.redeployPending}
          localOnly={geminiKeySource.localOnly}
        />
        {!geminiKeySource.hasActiveKey && !geminiKeySource.loading && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {t("pilot_no_gemini_key")}{" "}
            <Link to="/my-api" className="font-semibold underline">
              My API
            </Link>
          </p>
        )}
        {scanContext && (scanContext.shortSqueeze.length > 0 || scanContext.highCash.length > 0) && (
          <p className="mt-2 text-[10px] font-medium text-positive">{t("pilot_scan_linked")}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickPrompts.map((q, i) => (
            <button
              key={`${i}-${q.slice(0, 16)}`}
              type="button"
              onClick={() => send(q)}
              disabled={loading}
              className="rounded-full border border-hairline bg-white px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <AiPilotQuickPromptsDialog
        open={promptsDialogOpen}
        onOpenChange={setPromptsDialogOpen}
        prompts={quickPrompts}
        onAdd={addPrompt}
        onUpdate={updatePrompt}
        onDelete={deletePrompt}
        onReset={resetToDefaults}
      />

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-hairline bg-white/60 px-6 py-10 text-center">
            <p className="font-display text-sm font-semibold text-foreground">{t("pilot_empty_title")}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("pilot_empty_body")}</p>
            <button
              type="button"
              onClick={handleRunScan}
              disabled={scanLoading || !onRunScan}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Radar className="h-3.5 w-3.5" />
              )}
              {scanLoading ? t("pilot_scan_running") : t("pilot_go_scanner")}
            </button>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3",
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "border border-hairline bg-white shadow-sm",
              )}
            >
              {m.role === "user" ? (
                <p className="text-sm leading-relaxed">{m.content}</p>
              ) : m.response ? (
                <AssistantBody response={m.response} onFollowUp={send} />
              ) : (
                <p className="text-sm text-muted-foreground">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("pilot_thinking")}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <AiPilotScanResults
        shortSqueeze={scanData?.shortSqueeze ?? []}
        highCash={scanData?.highCash ?? []}
        loading={Boolean(scanLoading)}
        error={scanError ?? null}
        visible={scanTriggered}
      />

      {hasScanResults && !scanLoading && (
        <p className="border-t border-hairline bg-surface/60 px-4 py-2 text-center text-[10px] text-muted-foreground sm:px-6">
          {t("pilot_scan_done_hint")}
        </p>
      )}

      {/* Input dock */}
      <div className="border-t border-hairline bg-background/80 p-4 backdrop-blur-sm sm:px-6 sm:py-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={2}
            placeholder={t("pilot_input_placeholder")}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-hairline bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
