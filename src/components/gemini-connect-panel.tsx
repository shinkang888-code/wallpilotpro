import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { ChevronDown, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";



import { GeminiKeySourceBadge } from "@/components/gemini-key-source-badge";
import { GeminiSyncStatusBanner } from "@/components/gemini-sync-status-banner";

import {

  connectGemini,

  getGeminiStatus,

  testGeminiApiKey,

} from "@/lib/api/gemini-connect.functions";

import { useGeminiApiKey } from "@/lib/use-gemini-api-key";

import { useGeminiKeySource } from "@/lib/use-gemini-key-source";

import { useI18n } from "@/lib/i18n";

import { useVercelCredentials } from "@/lib/use-vercel-credentials";

import { cn } from "@/lib/utils";



export function GeminiConnectPanel() {

  const { t } = useI18n();

  const local = useGeminiApiKey();

  const keySource = useGeminiKeySource();

  const vercel = useVercelCredentials();

  const [draft, setDraft] = useState("");

  const [vercelKey, setVercelKey] = useState("");

  const [setupSecret, setSetupSecret] = useState("");

  const [revealKey, setRevealKey] = useState(false);

  const [openHelp, setOpenHelp] = useState(false);

  const [openVercel, setOpenVercel] = useState(false);

  const [loading, setLoading] = useState(false);

  const [testing, setTesting] = useState(false);

  const [status, setStatus] = useState<{

    configured: boolean;

    canSyncToVercel: boolean;

    vercelProjectId: string | null;

  } | null>(null);



  const refreshStatus = useCallback(async () => {

    try {

      const s = await getGeminiStatus({

        data: {

          ...(vercel.overrides ?? {}),

          geminiApiKey: local.key ?? undefined,

        },

      });

      setStatus(s);

    } catch {

      setStatus(null);

    }

  }, [vercel.overrides, local.key]);



  useEffect(() => {

    void refreshStatus();

  }, [refreshStatus]);



  const serverConfigured = status?.configured ?? keySource.vercelConfigured;

  const isConnected = keySource.hasActiveKey;

  const canSyncToVercel = status?.canSyncToVercel ?? vercel.hasLocalCreds;



  const messageFor = (code: string) => {

    const map: Record<string, string> = {

      invalid_gemini_key: t("gem_err_key"),

      gemini_unreachable: t("gem_err_unreachable"),

      vercel_not_configured: t("sb_err_vercel"),

      setup_secret_required: t("sb_err_secret"),

      verified: t("gem_test_ok"),

      saved: t("gem_save_ok"),

      saved_and_redeploying: t("gem_save_redeploy"),

    };

    return map[code] ?? code;

  };



  const runTest = async (key: string) => {

    if (!key.trim()) return false;

    setTesting(true);

    try {

      const res = await testGeminiApiKey({ data: { apiKey: key.trim() } });

      if (res.ok) {

        toast.success(messageFor(res.message));

        return true;

      }

      toast.error(messageFor(res.message));

      return false;

    } catch {

      toast.error(t("gem_err_unreachable"));

      return false;

    } finally {

      setTesting(false);

    }

  };



  const handleSaveLocal = async () => {

    if (!draft.trim()) return;

    const ok = await runTest(draft.trim());

    if (ok) {

      local.save(draft.trim());

      setDraft("");

      toast.success(t("gem_local_saved"));
      toast.warning(t("gem_warn_local_only"));

      await Promise.all([refreshStatus(), keySource.refresh()]);

    }

  };



  const handleSaveVercel = async () => {

    if (!vercelKey.trim()) return;

    setLoading(true);

    try {

      const res = await connectGemini({

        data: {

          apiKey: vercelKey.trim(),

          setupSecret: setupSecret.trim() || undefined,

          triggerRedeploy: true,

          ...vercel.overrides,

        },

      });

      if (res.ok) {

        toast.success(messageFor(res.message));

        local.save(vercelKey.trim());

        if (res.redeployStarted) {
          keySource.markRedeployPending();
        }

        setVercelKey("");

        await Promise.all([refreshStatus(), keySource.refresh()]);

      } else {

        toast.error(messageFor(res.message));

      }

    } catch {

      toast.error(t("gem_err_unreachable"));

    } finally {

      setLoading(false);

    }

  };



  const handleClearLocal = async () => {

    local.clear();

    await Promise.all([refreshStatus(), keySource.refresh()]);

  };



  return (

    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">

      <div className="flex items-start gap-3">

        <div

          className={cn(

            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",

            isConnected ? "bg-emerald-50 text-positive" : "bg-white text-primary",

          )}

        >

          {isConnected ? <ShieldCheck className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">

              {t("gem_panel_title")}

            </h2>

            <GeminiKeySourceBadge source={keySource.source} loading={keySource.loading} />

          </div>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">

            {t("gem_panel_subtitle")}

          </p>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">

            <span>

              {serverConfigured ? t("gem_storage_vercel") : t("gem_storage_vercel_empty")}

            </span>

            <span>·</span>

            <span>

              {local.isConnected ? t("gem_storage_local") : t("gem_storage_local_empty")}

            </span>

          </div>

        </div>

      </div>



      <p className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground">

        {t("gem_local_hint")}

      </p>

      <GeminiSyncStatusBanner
        className="mt-3"
        loading={keySource.loading}
        redeployPending={keySource.redeployPending}
        localOnly={keySource.localOnly}
      />



      <div className="mt-5">

        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">

          {t("gem_key_label")}

        </label>

        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">

          <div className="relative flex-1">

            <input

              type={revealKey ? "text" : "password"}

              value={local.isConnected ? (local.key ?? "") : draft}

              onChange={(e) => setDraft(e.target.value)}

              disabled={local.isConnected}

              placeholder={t("gem_key_placeholder")}

              className={cn(

                "w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm text-foreground",

                "placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10",

                "disabled:bg-surface disabled:text-muted-foreground",

              )}

            />

            <button

              type="button"

              onClick={() => setRevealKey((v) => !v)}

              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"

              aria-label="toggle reveal"

            >

              {revealKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

            </button>

          </div>



          {local.isConnected ? (

            <button

              type="button"

              onClick={() => void handleClearLocal()}

              className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98] hover:bg-red-50"

            >

              {t("gem_local_clear")}

            </button>

          ) : (

            <button

              type="button"

              onClick={() => void handleSaveLocal()}

              disabled={testing || !draft.trim()}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"

            >

              {testing && <Loader2 className="h-4 w-4 animate-spin" />}

              {t("gem_local_save")}

            </button>

          )}

        </div>

      </div>



      <button

        type="button"

        onClick={() => setOpenVercel((v) => !v)}

        className="mt-5 inline-flex w-full items-center justify-between rounded-xl border border-hairline bg-white px-4 py-3 text-left text-xs font-semibold text-foreground"

      >

        {t("gem_vercel_section")}

        <ChevronDown className={cn("h-4 w-4 transition-transform", openVercel && "rotate-180")} />

      </button>



      {openVercel && (

        <div className="mt-3 space-y-4 rounded-xl border border-hairline bg-white p-4">

          {!canSyncToVercel && (

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">

              {t("sb_vercel_hint")}

            </p>

          )}

          <input

            type="password"

            value={vercelKey}

            onChange={(e) => setVercelKey(e.target.value)}

            placeholder={t("gem_key_placeholder")}

            className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-mono text-sm"

          />

          <input

            type="password"

            value={setupSecret}

            onChange={(e) => setSetupSecret(e.target.value)}

            placeholder={t("sb_secret_placeholder")}

            className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-mono text-sm"

          />

          <button

            type="button"

            onClick={() => void handleSaveVercel()}

            disabled={loading || !canSyncToVercel || !vercelKey.trim()}

            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"

          >

            {loading && <Loader2 className="h-4 w-4 animate-spin" />}

            {t("sb_save_vercel")}

          </button>

        </div>

      )}



      <button

        type="button"

        onClick={() => setOpenHelp((v) => !v)}

        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"

      >

        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openHelp && "rotate-180")} />

        {t("gem_how")}

      </button>

      {openHelp && (

        <div className="mt-2 space-y-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-muted-foreground">

          <p>{t("gem_how_body")}</p>

          <p>{t("gem_how_local")}</p>

        </div>

      )}

    </section>

  );

}


