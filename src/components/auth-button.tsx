import { Link } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { tierDefinition } from "@/lib/membership/tiers";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function AuthButton() {
  const { t, lang } = useI18n();
  const auth = useAuth();

  if (!auth.enforced && !auth.loading) return null;

  if (auth.loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!auth.user) {
    return (
      <button
        type="button"
        onClick={() => {
          void auth.signInWithGoogle().then((err) => {
            if (err === "supabase_not_configured") toast.error(t("auth_err_client_config"));
            else if (err) toast.error(err);
          });
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
      >
        <GoogleMark className="h-4 w-4" />
        {t("sign_in_google")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {auth.isPending && (
        <Link
          to="/pending"
          className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 sm:inline"
        >
          {t("auth_pending_badge")}
        </Link>
      )}
      {auth.user && auth.isActive && (
        <span
          className={cn(
            "hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase sm:inline",
            auth.membershipTier === "elite"
              ? "bg-amber-100 text-amber-900"
              : auth.membershipTier === "premium"
                ? "bg-violet-100 text-violet-800"
                : auth.membershipTier === "day_trading"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface text-muted-foreground",
          )}
        >
          {tierDefinition(auth.membershipTier).name[lang]}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        {auth.profile?.avatarUrl ? (
          <img
            src={auth.profile.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full border border-hairline"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[10px] font-bold">
            {auth.user.email.slice(0, 1).toUpperCase()}
          </span>
        )}
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className={cn(
            "rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
          title={t("auth_sign_out")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
