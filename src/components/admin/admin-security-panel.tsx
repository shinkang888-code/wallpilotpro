import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

import { adminListSecurityAudits, adminRunSecurityAudit } from "@/lib/api/security.functions";
import { useI18n } from "@/lib/i18n";
import type { SecurityFinding } from "@/lib/security/audit.server";
import { cn } from "@/lib/utils";

export function AdminSecurityPanel({ accessToken }: { accessToken: string }) {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [status, setStatus] = useState<"pass" | "warn" | "fail" | null>(null);
  const [history, setHistory] = useState<
    Array<{ id: string; status: string; created_at: string; findings: SecurityFinding[] }>
  >([]);

  const loadHistory = useCallback(async () => {
    const data = await adminListSecurityAudits({ data: { accessToken } });
    setHistory(data as typeof history);
  }, [accessToken]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const run = async () => {
    setRunning(true);
    try {
      const res = await adminRunSecurityAudit({ data: { accessToken } });
      setFindings(res.findings);
      setStatus(res.status);
      await loadHistory();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("admin_security_desc")}</p>
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          {running && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_security_run")}
        </button>
      </div>

      {status && (
        <div
          className={cn(
            "rounded-2xl border p-4",
            status === "pass" && "border-positive/30 bg-emerald-50",
            status === "warn" && "border-amber-300 bg-amber-50",
            status === "fail" && "border-destructive/30 bg-red-50",
          )}
        >
          <div className="flex items-center gap-2 font-semibold">
            {status === "pass" ? (
              <CheckCircle2 className="h-4 w-4 text-positive" />
            ) : status === "fail" ? (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            )}
            {t("admin_security_result")}: {status.toUpperCase()}
          </div>
          {findings.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{t("admin_security_clean")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="rounded-lg bg-white/80 px-3 py-2 text-xs">
                  <span className="font-semibold uppercase text-destructive">[{f.severity}]</span>{" "}
                  {f.title}: {f.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("admin_security_history")}</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="rounded-xl border border-hairline px-3 py-2 text-xs">
                <span className="font-medium">{new Date(h.created_at).toLocaleString()}</span>
                <span className="ml-2 uppercase text-muted-foreground">{h.status}</span>
                <span className="ml-2 text-muted-foreground">
                  ({Array.isArray(h.findings) ? h.findings.length : 0} findings)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
