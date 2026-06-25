import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Terminal,
  XCircle,
} from "lucide-react";

import { getTradingAgentsDeskStatus } from "@/lib/api/ta.functions";
import { useI18n } from "@/lib/i18n";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import type { TradingAgentsStatus } from "@/lib/modules/ta/types";
import { cn } from "@/lib/utils";

const SETUP_STEPS = [
  {
    titleKey: "ta_setup_step1_title" as const,
    bodyKey: "ta_setup_step1_body" as const,
    command: "git clone https://github.com/TauricResearch/TradingAgents.git",
  },
  {
    titleKey: "ta_setup_step2_title" as const,
    bodyKey: "ta_setup_step2_body" as const,
    command: "cd services/tradingagents-api\npip install fastapi uvicorn tradingagents\nuvicorn main:app --host 0.0.0.0 --port 8100",
  },
  {
    titleKey: "ta_setup_step3_title" as const,
    bodyKey: "ta_setup_step3_body" as const,
    command: "TRADINGAGENTS_SERVICE_URL=https://your-sidecar",
  },
  {
    titleKey: "ta_setup_step4_title" as const,
    bodyKey: "ta_setup_step4_body" as const,
    command: "GEMINI_API_KEY=...\n# or\nOPENAI_API_KEY=...",
  },
  {
    titleKey: "ta_setup_step5_title" as const,
    bodyKey: "ta_setup_step5_body" as const,
    command: "TRADINGAGENTS_MAX_DEBATE_ROUNDS=2\nTRADINGAGENTS_DEEP_MODEL=gemini-2.0-flash\nTRADINGAGENTS_QUICK_MODEL=gemini-2.0-flash",
  },
] as const;

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (warn) return <Circle className="h-4 w-4 shrink-0 text-amber-500" />;
  return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
}

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      <Copy className="h-3 w-3" />
      {copied ? t("ta_setup_copied") : t("ta_setup_copy")}
    </button>
  );
}

export function AgentDeskSetupPanel() {
  const { t } = useI18n();
  const { key: geminiApiKey } = useGeminiApiKey();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TradingAgentsStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getTradingAgentsDeskStatus({ data: { geminiApiKey: geminiApiKey ?? undefined } });
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [geminiApiKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fullModeReady = Boolean(status?.sidecarOnline && status?.geminiConfigured);

  return (
    <section className="rounded-2xl border border-hairline bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              fullModeReady ? "bg-emerald-50 text-emerald-700" : "bg-white text-primary",
            )}
          >
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold sm:text-lg">{t("ta_setup_title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{t("ta_setup_subtitle")}</p>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <div className="border-t border-hairline px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {t("ta_setup_refresh")}
          </button>
          <a
            href="https://github.com/TauricResearch/TradingAgents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-primary hover:underline"
          >
            GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {status ? (
          <ul className="mb-5 grid gap-2 sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-xs">
              <StatusDot ok={status.sidecarConfigured} warn={status.sidecarConfigured && !status.sidecarOnline} />
              <span>
                {t("ta_status_sidecar")}:{" "}
                {status.sidecarConfigured
                  ? status.sidecarOnline
                    ? t("ta_status_online")
                    : t("ta_status_offline")
                  : t("ta_status_not_set")}
                {status.sidecarHost ? ` (${status.sidecarHost})` : ""}
                {status.sidecarLatencyMs != null && status.sidecarOnline ? ` · ${status.sidecarLatencyMs}ms` : ""}
              </span>
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-xs">
              <StatusDot ok={status.geminiConfigured} />
              <span>
                Gemini:{" "}
                {status.geminiConfigured
                  ? status.geminiSource === "local"
                    ? t("ta_status_gemini_local")
                    : t("ta_status_gemini_vercel")
                  : t("ta_status_not_set")}
              </span>
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-xs">
              <StatusDot ok={status.serverOpenaiConfigured} warn={!status.serverOpenaiConfigured} />
              <span>OpenAI (sidecar): {status.serverOpenaiConfigured ? t("ta_status_set") : t("ta_status_optional")}</span>
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-xs">
              <StatusDot ok={fullModeReady} warn={!fullModeReady} />
              <span>{fullModeReady ? t("ta_status_full_ready") : t("ta_status_fallback_mode")}</span>
            </li>
          </ul>
        ) : null}

        {open ? (
          <ol className="space-y-4">
            {SETUP_STEPS.map((step, i) => (
              <li key={step.titleKey} className="rounded-xl border border-hairline bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold">{t(step.titleKey)}</h3>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
                <div className="relative rounded-lg bg-zinc-950 px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    <Terminal className="h-3 w-3" />
                    {t("ta_setup_command_label")}
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-zinc-100">
                    {step.command}
                  </pre>
                  <div className="mt-2 flex justify-end">
                    <CopyButton text={step.command} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
