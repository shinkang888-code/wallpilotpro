import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { completeDanalCheckout, prepareDanalCheckout } from "@/lib/api/billing.functions";
import { stripePlanForTier, type MembershipTier } from "@/lib/membership/tiers";

declare global {
  interface Window {
    danalPayments?: {
      requestBilling: (params: Record<string, unknown>) => void;
    };
  }
}

const DANAL_SCRIPT = "https://js.danalpay.com/danalPayments/v1/danalPayments.js";

type DanalCheckoutButtonProps = {
  tier: Exclude<MembershipTier, "free">;
  accessToken: string;
  disabled?: boolean;
  label: string;
  onSuccess: () => void;
  simulateLabel?: string;
};

function loadDanalScript(): Promise<void> {
  if (window.danalPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${DANAL_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("danal_script_failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = DANAL_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("danal_script_failed"));
    document.body.appendChild(script);
  });
}

export function DanalCheckoutButton({
  tier,
  accessToken,
  disabled,
  label,
  onSuccess,
  simulateLabel,
}: DanalCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<{ orderId: string; plan: "pro" | "premium" | "elite" } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get("transactionId");
    const orderId = params.get("orderId") ?? params.get("order_id");
    const plan = params.get("plan") as "pro" | "premium" | "elite" | null;
    if (params.get("danal") !== "success" || !transactionId || !orderId || !plan) return;

    void completeDanalCheckout({
      data: { accessToken, transactionId, orderId, plan },
    }).then((r) => {
      if (r.ok) {
        onSuccess();
        window.history.replaceState({}, "", "/pricing");
      } else {
        toast.error(r.message ?? "danal_checkout_failed");
      }
    });
  }, [accessToken, onSuccess]);

  const checkout = async (simulate = false) => {
    setLoading(true);
    try {
      const plan = stripePlanForTier(tier) as "pro" | "premium" | "elite";
      const prep = await prepareDanalCheckout({ data: { accessToken, plan } });
      pendingRef.current = { orderId: prep.orderId, plan };

      if (simulate) {
        const result = await completeDanalCheckout({
          data: {
            accessToken,
            plan,
            transactionId: `sim_${Date.now()}`,
            orderId: prep.orderId,
            simulate: true,
          },
        });
        if (result.ok) onSuccess();
        else toast.error("danal_simulate_failed");
        return;
      }

      await loadDanalScript();
      if (!window.danalPayments?.requestBilling) {
        toast.error("danal_sdk_unavailable");
        return;
      }

      window.danalPayments.requestBilling({
        clientKey: prep.clientKey,
        merchantId: prep.merchantId,
        orderId: prep.orderId,
        amount: prep.amount,
        paymentsMethod: "CARD",
        issueKeyOnly: false,
        successUrl: prep.successUrl,
        failUrl: prep.failUrl,
        title: `WallPilot Pro ${plan}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "danal_checkout_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void checkout(false)}
        className="w-full rounded-xl border border-hairline bg-surface py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
      >
        {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : label}
      </button>
      {simulateLabel && (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void checkout(true)}
          className="text-[10px] text-muted-foreground underline"
        >
          {simulateLabel}
        </button>
      )}
    </div>
  );
}
