import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

export function AdminGate() {
  const { t } = useI18n();
  const auth = useAuth();

  if (auth.loading) return null;

  if (!auth.user) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-foreground">{t("admin_gate_sign_in")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin_gate_sign_in_body")}</p>
        <button
          type="button"
          onClick={() => void auth.signInWithGoogle()}
          className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {t("sign_in_google")}
        </button>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-amber-950">{t("admin_gate_forbidden")}</h2>
        <p className="mt-2 text-sm text-amber-900/80">{t("admin_gate_forbidden_body")}</p>
        <p className="mt-2 text-xs text-amber-800/70">{auth.user.email}</p>
      </div>
    );
  }

  return null;
}
