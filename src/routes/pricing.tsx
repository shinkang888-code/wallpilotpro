import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Header } from "@/components/header";
import { confirmCheckoutSession, getBillingStatus, startCheckout } from "@/lib/api/billing.functions";
import {
  MEMBERSHIP_TIERS,
  stripePlanForTier,
  tierRank,
  type MembershipTier,
} from "@/lib/membership/tiers";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const pricingSearch = z.object({
  success: z.string().optional(),
  canceled: z.string().optional(),
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/pricing")({
  validateSearch: (s) => pricingSearch.parse(s),
  component: PricingPage,
});

function PricingPage() {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const search = useSearch({ from: "/pricing" });
  const [stripeOk, setStripeOk] = useState(false);
  const [loadingTier, setLoadingTier] = useState<MembershipTier | null>(null);

  const currentTier = auth.membershipTier;

  useEffect(() => {
    void getBillingStatus({ data: {} }).then((r) => setStripeOk(r.stripeConfigured));
  }, []);

  useEffect(() => {
    if (search.success && search.session_id && auth.accessToken) {
      void confirmCheckoutSession({
        data: { accessToken: auth.accessToken, sessionId: search.session_id },
      }).then((r) => {
        if (r.ok) {
          toast.success(t("pricing_success"));
          void auth.refresh();
        }
      });
    }
    if (search.canceled) toast.message(t("pricing_canceled"));
  }, [search.success, search.session_id, search.canceled, auth, t]);

  const checkout = async (tier: MembershipTier) => {
    if (tier === "free") return;
    if (!auth.accessToken) {
      toast.error(t("auth_sign_in_first"));
      return;
    }
    if (!auth.isActive) {
      toast.error(t("account_not_active"));
      return;
    }
    const plan = stripePlanForTier(tier);
    setLoadingTier(tier);
    try {
      const { url } = await startCheckout({
        data: {
          accessToken: auth.accessToken,
          plan: plan as "pro" | "premium" | "elite",
        },
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "checkout_failed");
    } finally {
      setLoadingTier(null);
    }
  };

  const ranks: Record<MembershipTier, number> = {
    free: tierRank("free"),
    day_trading: tierRank("day_trading"),
    premium: tierRank("premium"),
    elite: tierRank("elite"),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">{t("pricing_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pricing_subtitle")}</p>
        {auth.user && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {t("membership_current")}: {MEMBERSHIP_TIERS.find((x) => x.id === currentTier)?.name[lang]}
          </p>
        )}
        {!stripeOk && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {t("pricing_stripe_hint")}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBERSHIP_TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const isUpgrade = ranks[tier.id] > ranks[currentTier];
            const isPremium = tier.id === "premium";
            const isElite = tier.id === "elite";

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border border-hairline bg-surface p-5",
                  isCurrent && "border-primary/40 ring-2 ring-primary/20",
                  isPremium && "border-violet-200 bg-gradient-to-b from-violet-50/80 to-surface",
                  isElite && "border-amber-200 bg-gradient-to-b from-amber-50/80 to-surface",
                )}
              >
                {isPremium && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("membership_premium_badge")}
                  </span>
                )}
                {isElite && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Elite
                  </span>
                )}
                <h2 className="font-display text-lg font-semibold">{tier.name[lang]}</h2>
                <p className="mt-1 text-2xl font-bold tabular-nums">{tier.priceLabel[lang]}</p>
                <ul className="mt-4 flex-1 space-y-2 text-xs text-muted-foreground">
                  {tier.features[lang].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier.id === "free" ? (
                  <p className="mt-5 w-full rounded-xl border border-hairline py-2.5 text-center text-sm font-semibold text-muted-foreground">
                    {isCurrent ? t("pricing_current") : t("pricing_included")}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!stripeOk || loadingTier === tier.id || (isCurrent && !isUpgrade)}
                    onClick={() => void checkout(tier.id)}
                    className={cn(
                      "mt-5 w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50",
                      isPremium
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {loadingTier === tier.id ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      t("pricing_current")
                    ) : isUpgrade ? (
                      t("pricing_cta")
                    ) : (
                      t("pricing_cta")
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">
          ← {t("pending_back")}
        </Link>
      </main>
    </div>
  );
}
