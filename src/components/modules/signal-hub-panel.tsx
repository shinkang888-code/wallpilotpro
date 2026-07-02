import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MessageSquare, Radio, Send } from "lucide-react";

import {
  getSignalFeed,
  postSignalReply,
  publishSignal,
  trackSignalHubView,
} from "@/lib/api/ait.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import type { AitMessageType, AitSignal } from "@/lib/modules/ait/types";
import { cn } from "@/lib/utils";

const TOSS_INVEST_URL = "https://www.tossinvest.com/";

const TABS: { id: AitMessageType | "all"; labelKey: string }[] = [
  { id: "all", labelKey: "ait_tab_all" },
  { id: "operation", labelKey: "ait_tab_operation" },
  { id: "strategy", labelKey: "ait_tab_strategy" },
  { id: "discussion", labelKey: "ait_tab_discussion" },
];

export function SignalHubPanel() {
  const { t } = useI18n();
  const { accessToken, entitlements, enforced, isActive } = useAuth();
  const [tab, setTab] = useState<AitMessageType | "all">("all");
  const [signals, setSignals] = useState<AitSignal[]>([]);
  const [source, setSource] = useState<"wallpilot" | "ai-trader">("wallpilot");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [tossFrameOpen, setTossFrameOpen] = useState(true);
  const [form, setForm] = useState({
    messageType: "strategy" as AitMessageType,
    market: "us-stock",
    symbol: "",
    title: "",
    content: "",
  });
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const canWrite = !enforced || (isActive && Boolean(entitlements?.signals_write));

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSignalFeed({
        data: {
          accessToken,
          messageType: tab === "all" ? undefined : tab,
          limit: 30,
        },
      });
      setSignals(res.signals);
      setSource(res.source);
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "feed_failed", t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void trackSignalHubView({ data: { accessToken } });
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, accessToken]);

  const handlePublish = async () => {
    if (!canWrite) return;
    try {
      await publishSignal({
        data: {
          accessToken,
          messageType: form.messageType,
          market: form.market,
          symbol: form.symbol || undefined,
          title: form.title || undefined,
          content: form.content,
        },
      });
      setPublishOpen(false);
      setForm({ messageType: "strategy", market: "us-stock", symbol: "", title: "", content: "" });
      await loadFeed();
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "publish_failed", t));
    }
  };

  const handleReply = async (signalId: string) => {
    const content = replyDraft[signalId]?.trim();
    if (!content || !canWrite) return;
    try {
      await postSignalReply({ data: { accessToken, signalId, content } });
      setReplyDraft((prev) => ({ ...prev, [signalId]: "" }));
      await loadFeed();
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "reply_failed", t));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-6">
      <div className="shrink-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Radio className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">ait.* · AI-Trader</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{source}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTossFrameOpen((v) => !v)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                tossFrameOpen
                  ? "border-[#3182f6] bg-[rgba(49,130,246,0.12)] text-[#3182f6]"
                  : "border-hairline text-muted-foreground hover:border-[#3182f6]/40",
              )}
            >
              {t("ait_toss_frame_toggle")}
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => setPublishOpen((v) => !v)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t("ait_publish")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                tab === item.id ? "border-primary bg-primary/10 text-primary" : "border-hairline text-muted-foreground",
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {publishOpen ? (
          <section className="space-y-3 rounded-2xl border border-hairline bg-surface p-4">
            <select
              value={form.messageType}
              onChange={(e) => setForm((f) => ({ ...f, messageType: e.target.value as AitMessageType }))}
              className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
            >
              <option value="operation">{t("ait_tab_operation")}</option>
              <option value="strategy">{t("ait_tab_strategy")}</option>
              <option value="discussion">{t("ait_tab_discussion")}</option>
            </select>
            <input
              placeholder={t("ait_symbol_placeholder")}
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
            <input
              placeholder={t("ait_title_placeholder")}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
            <textarea
              placeholder={t("ait_content_placeholder")}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              <Send className="h-4 w-4" />
              {t("ait_submit")}
            </button>
          </section>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-[32vh] space-y-4 overflow-y-auto">
          {signals.map((signal) => (
            <article key={signal.id} className="rounded-2xl border border-hairline bg-white p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{signal.authorName}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                  {signal.messageType}
                </span>
                {signal.symbol ? <span>{signal.symbol}</span> : null}
                {signal.side ? <span className="uppercase">{signal.side}</span> : null}
                {signal.qualityScore != null ? <span>Q {signal.qualityScore.toFixed(1)}</span> : null}
              </div>
              {signal.title ? <h3 className="font-semibold text-foreground">{signal.title}</h3> : null}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{signal.content}</p>
              {canWrite ? (
                <div className="mt-4 flex gap-2">
                  <input
                    value={replyDraft[signal.id] ?? ""}
                    onChange={(e) => setReplyDraft((prev) => ({ ...prev, [signal.id]: e.target.value }))}
                    placeholder={t("ait_reply_placeholder")}
                    className="flex-1 rounded-lg border border-hairline px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void handleReply(signal.id)}
                    className="rounded-lg border border-hairline px-3 py-2 text-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!loading && signals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("ait_empty")}</p>
          ) : null}
        </div>
      </div>

      {tossFrameOpen ? (
        <section className="mt-auto flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(49,130,246,0.25)] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-[rgba(49,130,246,0.06)] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-[#3182f6]">{t("ait_toss_frame_title")}</p>
              <p className="text-[11px] text-muted-foreground">{t("ait_toss_frame_sub")}</p>
            </div>
            <a
              href={TOSS_INVEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[#3182f6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1b64da]"
            >
              {t("ait_toss_frame_new_tab")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <Radio className="h-10 w-10 text-[#3182f6]/60" />
            <p className="max-w-md text-sm text-muted-foreground">{t("ait_toss_frame_fallback")}</p>
            <a
              href={TOSS_INVEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 px-5 py-2.5 text-sm font-semibold text-[#3182f6] hover:bg-[#3182f6]/10"
            >
              tossinvest.com
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
