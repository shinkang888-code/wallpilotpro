import { getServerConfig } from "@/lib/config.server";
import type { SubscriptionPlan } from "@/lib/types/auth";

const RESEND_API = "https://api.resend.com/emails";

type EmailResult = { ok: boolean; skipped?: boolean; id?: string; error?: string };

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "WallPilot Pro <onboarding@resend.dev>";
}

function siteUrl() {
  const { authSiteUrl } = getServerConfig();
  return authSiteUrl.replace(/\/$/, "");
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const { resendApiKey } = getServerConfig();
  if (!resendApiKey) return { ok: false, skipped: true };

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!res?.ok) {
    const err = await res?.text().catch(() => "send_failed");
    return { ok: false, error: err };
  }

  const json = (await res.json()) as { id?: string };
  return { ok: true, id: json.id };
}

export function isEmailConfigured(): boolean {
  return Boolean(getServerConfig().resendApiKey);
}

const PLAN_LABELS: Record<SubscriptionPlan, { en: string; ko: string }> = {
  free: { en: "Free", ko: "무료" },
  basic: { en: "Day Trading", ko: "단타" },
  pro: { en: "Day Trading", ko: "단타" },
  premium: { en: "Premium", ko: "프리미엄" },
  elite: { en: "Elite", ko: "엘리트" },
};

export async function sendAccountApprovedEmail(to: string, displayName?: string | null): Promise<EmailResult> {
  const name = displayName?.trim() || to;
  const url = siteUrl();
  return sendEmail(
    to,
    "[WallPilot Pro] 계정이 승인되었습니다",
    `<p>안녕하세요 ${name}님,</p>
<p>WallPilot Pro 가입이 승인되었습니다. 지금 바로 로그인해 주세요.</p>
<p><a href="${url}">${url}</a></p>
<p>감사합니다.<br/>WallPilot Pro</p>`,
  );
}

export async function sendAccountSuspendedEmail(to: string, displayName?: string | null): Promise<EmailResult> {
  const name = displayName?.trim() || to;
  return sendEmail(
    to,
    "[WallPilot Pro] 계정 상태 변경 안내",
    `<p>안녕하세요 ${name}님,</p>
<p>WallPilot Pro 계정이 일시 중지되었습니다. 문의가 필요하시면 관리자에게 연락해 주세요.</p>
<p>WallPilot Pro</p>`,
  );
}

export async function sendSubscriptionActivatedEmail(
  to: string,
  plan: SubscriptionPlan,
  provider: "stripe" | "danal",
): Promise<EmailResult> {
  const label = PLAN_LABELS[plan]?.ko ?? plan;
  const providerLabel = provider === "danal" ? "다날" : "Stripe";
  return sendEmail(
    to,
    `[WallPilot Pro] ${label} 구독이 시작되었습니다`,
    `<p>안녕하세요,</p>
<p>${providerLabel} 결제로 <strong>${label}</strong> 구독이 활성화되었습니다.</p>
<p><a href="${siteUrl()}/pricing">요금제 관리</a></p>
<p>WallPilot Pro</p>`,
  );
}

export async function sendSubscriptionCanceledEmail(to: string, plan: SubscriptionPlan): Promise<EmailResult> {
  const label = PLAN_LABELS[plan]?.ko ?? plan;
  return sendEmail(
    to,
    `[WallPilot Pro] 구독이 종료되었습니다`,
    `<p>안녕하세요,</p>
<p><strong>${label}</strong> 구독이 종료되어 무료 플랜으로 전환되었습니다.</p>
<p><a href="${siteUrl()}/pricing">요금제 다시 선택</a></p>
<p>WallPilot Pro</p>`,
  );
}
