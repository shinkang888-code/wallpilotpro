import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Cloud, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import {
  connectVercel,
  getVercelStatus,
  testVercelToken,
} from "@/lib/api/vercel-connect.functions";
import { useI18n } from "@/lib/i18n";
import { useVercelCredentials } from "@/lib/use-vercel-credentials";
import { cn } from "@/lib/utils";

type VercelProject = { id: string; name: string };

export function VercelConnectPanel() {
  const { t } = useI18n();
  const vercel = useVercelCredentials();
  const [revealToken, setRevealToken] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [openHelp, setOpenHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [status, setStatus] = useState<{
    configured: boolean;
    tokenConfigured: boolean;
    projectId: string | null;
    teamId: string | null;
  } | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getVercelStatus({ data: {} });
      setStatus(s);
      if (s.projectId && !vercel.projectId) {
        vercel.setProjectId(s.projectId);
      }
      if (s.teamId && !vercel.teamId) {
        vercel.setTeamId(s.teamId);
      }
    } catch {
      setStatus(null);
    }
  }, [vercel]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const isConnected = status?.configured ?? false;

  const messageFor = (code: string) => {
    const map: Record<string, string> = {
      invalid_vercel_token: t("vc_err_token"),
      invalid_vercel_project: t("vc_err_project"),
      vercel_unreachable: t("vc_err_unreachable"),
      vercel_projects_failed: t("vc_err_projects"),
      setup_secret_required: t("sb_err_secret"),
      verified: t("vc_test_ok"),
      saved: t("vc_save_ok"),
      saved_and_redeploying: t("vc_save_redeploy"),
    };
    return map[code] ?? code;
  };

  const handleTest = async () => {
    if (!vercel.token.trim()) return;
    setTesting(true);
    try {
      const res = await testVercelToken({
        data: {
          accessToken: vercel.token.trim(),
          teamId: vercel.teamId.trim() || undefined,
        },
      });
      if (res.ok) {
        setProjects(res.projects);
        const who = res.username ? ` (@${res.username})` : "";
        toast.success(`${messageFor("verified")}${who}`);
        if (res.projects.length === 1 && !vercel.projectId) {
          vercel.setProjectId(res.projects[0].id);
        }
      } else {
        toast.error(messageFor(res.message));
        setProjects([]);
      }
    } catch {
      toast.error(t("vc_err_unreachable"));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!vercel.token.trim() || !vercel.projectId.trim()) return;
    setLoading(true);
    try {
      const res = await connectVercel({
        data: {
          accessToken: vercel.token.trim(),
          projectId: vercel.projectId.trim(),
          teamId: vercel.teamId.trim() || undefined,
          setupSecret: setupSecret.trim() || undefined,
          triggerRedeploy: true,
        },
      });
      if (res.ok) {
        toast.success(messageFor(res.message));
        vercel.persist({
          accessToken: vercel.token.trim(),
          projectId: vercel.projectId.trim(),
          teamId: vercel.teamId.trim() || undefined,
        });
        await refreshStatus();
      } else {
        toast.error(messageFor(res.message));
      }
    } catch {
      toast.error(t("vc_err_unreachable"));
    } finally {
      setLoading(false);
    }
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
          {isConnected ? <ShieldCheck className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
            {t("vc_panel_title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("vc_panel_subtitle")}
          </p>
          {status && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isConnected ? t("vc_connected") : t("vc_disconnected")}
              {status.projectId && (
                <span className="ml-2 font-mono normal-case tracking-normal">
                  · {status.projectId.slice(0, 12)}…
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground">
        {t("vc_usage_hint")}
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("vc_token_label")}
          </label>
          <div className="relative mt-1.5">
            <input
              type={revealToken ? "text" : "password"}
              value={vercel.token}
              onChange={(e) => vercel.setToken(e.target.value)}
              placeholder={t("vc_token_placeholder")}
              className="w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={() => setRevealToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
              aria-label="toggle reveal"
            >
              {revealToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("vc_project_label")}
          </label>
          {projects.length > 0 ? (
            <select
              value={vercel.projectId}
              onChange={(e) => vercel.setProjectId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="">{t("vc_project_select")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={vercel.projectId}
              onChange={(e) => vercel.setProjectId(e.target.value)}
              placeholder="prj_xxxxxxxxxxxx"
              className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("vc_team_label")}
          </label>
          <input
            type="text"
            value={vercel.teamId}
            onChange={(e) => vercel.setTeamId(e.target.value)}
            placeholder={t("vc_team_placeholder")}
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("sb_secret_label")}
          </label>
          <input
            type="password"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder={t("sb_secret_placeholder")}
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !vercel.token.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("vc_test")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !vercel.token.trim() || !vercel.projectId.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("vc_save")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpenHelp((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openHelp && "rotate-180")} />
        {t("vc_how")}
      </button>
      {openHelp && (
        <div className="mt-2 space-y-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-muted-foreground">
          <p>{t("vc_how_body")}</p>
          <p>{t("vc_how_usage")}</p>
        </div>
      )}
    </section>
  );
}
