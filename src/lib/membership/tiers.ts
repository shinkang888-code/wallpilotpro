import type { AppLocale } from "@/lib/i18n/constants";
import type { AuthSession, SubscriptionPlan } from "@/lib/types/auth";

/** User-facing 4-tier membership (SaaS). */
export type MembershipTier = "free" | "day_trading" | "premium" | "elite";

export type LocalizedText = { en: string; ko: string } & Partial<Record<AppLocale, string>>;

export type MembershipTierDefinition = {
  id: MembershipTier;
  name: LocalizedText;
  priceLabel: LocalizedText;
  /** Stripe-backed plan id in `subscriptions.plan` (null = free). */
  stripePlan: SubscriptionPlan | null;
  stripePriceEnv: string | null;
  features: { en: string[]; ko: string[] } & Partial<Record<AppLocale, string[]>>;
};

export const MEMBERSHIP_TIERS: MembershipTierDefinition[] = [
  {
    id: "free",
    name: {
      en: "Free",
      ko: "무료 회원",
      ja: "無料",
      zh: "免费",
      vi: "Miễn phí",
      tl: "Libre",
      id: "Gratis",
      hi: "मुफ़्त",
    },
    priceLabel: {
      en: "$0",
      ko: "무료",
      ja: "¥0",
      zh: "¥0",
      vi: "0₫",
      tl: "₱0",
      id: "Rp0",
      hi: "₹0",
    },
    stripePlan: null,
    stripePriceEnv: null,
    features: {
      en: ["Google sign-in", "Scanner preview", "Signal Hub read-only"],
      ko: ["Google 로그인", "스캐너 미리보기", "시그널 허브 열람"],
      ja: ["Googleログイン", "スキャナープレビュー", "シグナルハブ閲覧のみ"],
      zh: ["Google 登录", "扫描器预览", "信号中心只读"],
      vi: ["Đăng nhập Google", "Xem trước Scanner", "Signal Hub chỉ đọc"],
      tl: ["Google sign-in", "Preview ng Scanner", "Signal Hub read-only"],
      id: ["Masuk Google", "Pratinjau Scanner", "Signal Hub baca saja"],
      hi: ["Google साइन-इन", "स्कैनर पूर्वावलोकन", "Signal Hub केवल पढ़ें"],
    },
  },
  {
    id: "day_trading",
    name: {
      en: "Day Trading",
      ko: "단타 회원",
      ja: "デイトレード",
      zh: "日内交易",
      vi: "Giao dịch ngày",
      tl: "Day Trading",
      id: "Day Trading",
      hi: "डे ट्रेडिंग",
    },
    priceLabel: {
      en: "$29/mo",
      ko: "월 ₩39,000",
      ja: "月$29",
      zh: "月 $29",
      vi: "$29/tháng",
      tl: "$29/buwan",
      id: "$29/bln",
      hi: "$29/माह",
    },
    stripePlan: "pro",
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: {
      en: ["Full Reverse-Quant scan", "Wall St. Report", "Signal Hub post/copy"],
      ko: ["리버스 퀀트 스캔", "월가리포트", "시그널 허브 게시·카피"],
      ja: ["フル Reverse-Quant スキャン", "Wall St. Report", "シグナルハブ投稿"],
      zh: ["完整 Reverse-Quant 扫描", "Wall St. Report", "信号中心发布"],
      vi: ["Quét Reverse-Quant đầy đủ", "Wall St. Report", "Đăng Signal Hub"],
      tl: ["Buong Reverse-Quant scan", "Wall St. Report", "Mag-post sa Signal Hub"],
      id: ["Scan Reverse-Quant penuh", "Wall St. Report", "Posting Signal Hub"],
      hi: ["पूर्ण Reverse-Quant स्कैन", "Wall St. Report", "Signal Hub पोस्ट"],
    },
  },
  {
    id: "premium",
    name: {
      en: "Premium",
      ko: "프리미엄 회원",
      ja: "プレミアム",
      zh: "高级版",
      vi: "Premium",
      tl: "Premium",
      id: "Premium",
      hi: "प्रीमियम",
    },
    priceLabel: {
      en: "$59/mo",
      ko: "월 ₩99,000",
      ja: "月$59",
      zh: "月 $59",
      vi: "$59/tháng",
      tl: "$59/buwan",
      id: "$59/bln",
      hi: "$59/माह",
    },
    stripePlan: "premium",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM",
    features: {
      en: ["AI Pilot", "Agent Desk", "PDF export on reports"],
      ko: ["AI Pilot", "에이전트 분석", "리포트 PDF 출력"],
      ja: ["AI Pilot", "Agent Desk", "レポートPDF出力"],
      zh: ["AI Pilot", "Agent Desk", "报告 PDF 导出"],
      vi: ["AI Pilot", "Agent Desk", "Xuất PDF báo cáo"],
      tl: ["AI Pilot", "Agent Desk", "PDF export sa report"],
      id: ["AI Pilot", "Agent Desk", "Ekspor PDF laporan"],
      hi: ["AI Pilot", "Agent Desk", "रिपोर्ट PDF निर्यात"],
    },
  },
  {
    id: "elite",
    name: {
      en: "Elite",
      ko: "엘리트 회원",
      ja: "エリート",
      zh: "精英版",
      vi: "Elite",
      tl: "Elite",
      id: "Elite",
      hi: "एलीट",
    },
    priceLabel: {
      en: "$99/mo",
      ko: "월 ₩199,000",
      ja: "月$99",
      zh: "月 $99",
      vi: "$99/tháng",
      tl: "$99/buwan",
      id: "$99/bln",
      hi: "$99/माह",
    },
    stripePlan: "elite",
    stripePriceEnv: "STRIPE_PRICE_ELITE",
    features: {
      en: ["Everything in Premium", "RL Lab", "Toss order execution"],
      ko: ["프리미엄 전체", "RL 연구소", "토스 주문 실행"],
      ja: ["プレミアム全機能", "RL Lab", "Toss注文実行"],
      zh: ["Premium 全部功能", "RL Lab", "Toss 下单执行"],
      vi: ["Toàn bộ Premium", "RL Lab", "Thực thi lệnh Toss"],
      tl: ["Lahat ng Premium", "RL Lab", "Toss order execution"],
      id: ["Semua Premium", "RL Lab", "Eksekusi order Toss"],
      hi: ["Premium की सभी सुविधाएँ", "RL Lab", "Toss ऑर्डर निष्पादन"],
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

export function minTierLabel(tier: MembershipTier, lang: AppLocale): string {
  const name = tierDefinition(tier).name;
  return name[lang] ?? name.en;
}

export function tierFeatures(tier: MembershipTier, lang: AppLocale): string[] {
  const f = tierDefinition(tier).features;
  return f[lang] ?? f.en;
}
