import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Radio, Send } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">ait.* · AI-Trader</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{source}</span>
        </div>
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
        <section className="rounded-2xl border border-hairline bg-surface p-4 space-y-3">
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
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-4">
        {signals.map((signal) => (
          <article key={signal.id} className="rounded-2xl border border-hairline bg-white p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{signal.authorName}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                {signal.messageType}
              </span>
              {signal.symbol ? <span>{signal.symbol}</span> : null}
              {signal.side ? <span className="uppercase">{signal.side}</span> : null}
              {signal.qualityScore != null ? (
                <span>Q {signal.qualityScore.toFixed(1)}</span>
              ) : null}
            </div>
            {signal.title ? <h3 className="font-semibold text-foreground">{signal.title}</h3> : null}
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{signal.content}</p>
            {signal.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {signal.tags.map((tag) => (
                  <span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

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
          <p className="py-8 text-center text-sm text-muted-foreground">{t("ait_empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
