import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { DanalCheckoutButton } from "@/components/billing/danal-checkout-button";
import { Header } from "@/components/header";
import { pickLocaleString } from "@/components/language-scroll-selector";
import {
  confirmCheckoutSession,
  getBillingStatus,
  openCustomerPortal,
  startCheckout,
} from "@/lib/api/billing.functions";
import {
  MEMBERSHIP_TIERS,
  stripePlanForTier,
  tierFeatures,
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
  danal: z.string().optional(),
});

type PayMethod = "stripe" | "danal";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s) => pricingSearch.parse(s),
  component: PricingPage,
});

function PricingPage() {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const search = useSearch({ from: "/pricing" });
  const [stripeOk, setStripeOk] = useState(false);
  const [danalOk, setDanalOk] = useState(false);
  const [canManagePortal, setCanManagePortal] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("stripe");
  const [loadingTier, setLoadingTier] = useState<MembershipTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentTier = auth.membershipTier;
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    void getBillingStatus({ data: { accessToken: auth.accessToken ?? undefined } }).then((r) => {
      setStripeOk(r.stripeConfigured);
      setDanalOk(r.danalConfigured);
      setCanManagePortal(r.canManagePortal);
      if (r.danalConfigured && !r.stripeConfigured) setPayMethod("danal");
    });
  }, [auth.accessToken]);

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
    if (search.danal === "canceled") toast.message(t("pricing_danal_canceled"));
  }, [search.success, search.session_id, search.canceled, search.danal, auth, t]);

  const stripeCheckout = async (tier: MembershipTier) => {
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

  const openPortal = async () => {
    if (!auth.accessToken) return;
    setPortalLoading(true);
    try {
      const { url } = await openCustomerPortal({ data: { accessToken: auth.accessToken } });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "portal_failed");
    } finally {
      setPortalLoading(false);
    }
  };

  const ranks: Record<MembershipTier, number> = {
    free: tierRank("free"),
    day_trading: tierRank("day_trading"),
    premium: tierRank("premium"),
    elite: tierRank("elite"),
  };

  const payReady = payMethod === "stripe" ? stripeOk : danalOk || isDev;

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">{t("pricing_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pricing_subtitle")}</p>
        {auth.user && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t("membership_current")}: {pickLocaleString(MEMBERSHIP_TIERS.find((x) => x.id === currentTier)!.name, lang)}
            </p>
            {canManagePortal && (
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={portalLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Settings2 className="h-3 w-3" />
                )}
                {t("pricing_manage")}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPayMethod("stripe")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold",
              payMethod === "stripe"
                ? "border-primary bg-primary/10 text-primary"
                : "border-hairline text-muted-foreground",
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {t("pricing_pay_stripe")}
          </button>
          <button
            type="button"
            onClick={() => setPayMethod("danal")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold",
              payMethod === "danal"
                ? "border-primary bg-primary/10 text-primary"
                : "border-hairline text-muted-foreground",
            )}
          >
            {t("pricing_pay_danal")}
          </button>
        </div>

        {payMethod === "stripe" && !stripeOk && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {t("pricing_stripe_hint")}
          </p>
        )}
        {payMethod === "danal" && !danalOk && !isDev && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {t("pricing_danal_hint")}
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
                <h2 className="font-display text-lg font-semibold">{pickLocaleString(tier.name, lang)}</h2>
                <p className="mt-1 text-2xl font-bold tabular-nums">{pickLocaleString(tier.priceLabel, lang)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-xs text-muted-foreground">
                  {tierFeatures(tier.id, lang).map((f) => (
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
                ) : payMethod === "danal" ? (
                  auth.accessToken && auth.isActive ? (
                    <div className="mt-5">
                      <DanalCheckoutButton
                        tier={tier.id}
                        accessToken={auth.accessToken}
                        disabled={!payReady || (isCurrent && !isUpgrade)}
                        label={isCurrent && !isUpgrade ? t("pricing_current") : t("pricing_danal_cta")}
                        simulateLabel={isDev && !danalOk ? t("pricing_danal_simulate") : undefined}
                        onSuccess={() => {
                          toast.success(t("pricing_success"));
                          void auth.refresh();
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-5 w-full rounded-xl border border-hairline py-2.5 text-sm font-semibold opacity-50"
                    >
                      {t("pricing_danal_cta")}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={!payReady || loadingTier === tier.id || (isCurrent && !isUpgrade)}
                    onClick={() => void stripeCheckout(tier.id)}
                    className={cn(
                      "mt-5 w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50",
                      isPremium
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {loadingTier === tier.id ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : isCurrent && !isUpgrade ? (
                      t("pricing_current")
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
