import type { AuthSession, SubscriptionPlan } from "@/lib/types/auth";

/** User-facing 4-tier membership (SaaS). */
export type MembershipTier = "free" | "day_trading" | "premium" | "elite";

export type MembershipTierDefinition = {
  id: MembershipTier;
  name: { en: string; ko: string };
  priceLabel: { en: string; ko: string };
  /** Stripe-backed plan id in `subscriptions.plan` (null = free). */
  stripePlan: SubscriptionPlan | null;
  stripePriceEnv: string | null;
  features: { en: string[]; ko: string[] };
};

export const MEMBERSHIP_TIERS: MembershipTierDefinition[] = [
  {
    id: "free",
    name: { en: "Free", ko: "무료 회원" },
    priceLabel: { en: "$0", ko: "무료" },
    stripePlan: null,
    stripePriceEnv: null,
    features: {
      en: ["Google sign-in", "Scanner preview", "Signal Hub read-only"],
      ko: ["Google 로그인", "스캐너 미리보기", "시그널 허브 열람"],
    },
  },
  {
    id: "day_trading",
    name: { en: "Day Trading", ko: "단타 회원" },
    priceLabel: { en: "$29/mo", ko: "월 ₩39,000" },
    stripePlan: "pro",
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: {
      en: ["Full Reverse-Quant scan", "Wall St. Report", "Signal Hub post/copy"],
      ko: ["리버스 퀀트 스캔", "월가리포트", "시그널 허브 게시·카피"],
    },
  },
  {
    id: "premium",
    name: { en: "Premium", ko: "프리미엄 회원" },
    priceLabel: { en: "$59/mo", ko: "월 ₩99,000" },
    stripePlan: "premium",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM",
    features: {
      en: ["AI Pilot", "Agent Desk", "PDF export on reports"],
      ko: ["AI Pilot", "에이전트 분석", "리포트 PDF 출력"],
    },
  },
  {
    id: "elite",
    name: { en: "Elite", ko: "엘리트 회원" },
    priceLabel: { en: "$99/mo", ko: "월 ₩199,000" },
    stripePlan: "elite",
    stripePriceEnv: "STRIPE_PRICE_ELITE",
    features: {
      en: ["Everything in Premium", "RL Lab", "Toss order execution"],
      ko: ["프리미엄 전체", "RL 연구소", "토스 주문 실행"],
    },
  },
];

function effectivePlan(session: AuthSession): SubscriptionPlan {
  const { plan, status } = session.subscription;
  if (status === "active" || status === "trialing") return plan;
  return "free";
}

export function membershipTierFromPlan(plan: SubscriptionPlan): MembershipTier {
  if (plan === "elite") return "elite";
  if (plan === "premium") return "premium";
  if (plan === "pro" || plan === "basic") return "day_trading";
  return "free";
}

export function membershipTierFor(session: AuthSession): MembershipTier {
  if (session.profile.role === "admin") return "elite";
  if (session.profile.accountStatus !== "active") return "free";
  return membershipTierFromPlan(effectivePlan(session));
}

export function stripePlanForTier(tier: Exclude<MembershipTier, "free">): SubscriptionPlan {
  const def = MEMBERSHIP_TIERS.find((t) => t.id === tier);
  return def?.stripePlan ?? "pro";
}

export function tierDefinition(tier: MembershipTier): MembershipTierDefinition {
  return MEMBERSHIP_TIERS.find((t) => t.id === tier) ?? MEMBERSHIP_TIERS[0];
}

export function tierRank(tier: MembershipTier): number {
  const order: MembershipTier[] = ["free", "day_trading", "premium", "elite"];
  return order.indexOf(tier);
}

export function minTierLabel(tier: MembershipTier, lang: "en" | "ko"): string {
  return tierDefinition(tier).name[lang];
}
