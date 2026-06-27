// filepath: src/components/legal/privacy-content.tsx
import { IP_INVENTOR, IP_OWNER, IP_PRODUCT } from "@/lib/ip/ownership";

export function PrivacyContent({ locale = "ko" }: { locale?: "ko" | "en" }) {
  if (locale === "en") {
    return (
      <article className="prose prose-sm max-w-none space-y-6 text-muted-foreground dark:prose-invert">
        <p className="text-xs text-muted-foreground">Last updated: 2026-06-27 · Version 1.0</p>
        <h2 className="text-lg font-bold text-foreground">Privacy Policy</h2>
        <p>
          {IP_OWNER.legalName} (&quot;Terrabridge&quot;) describes how {IP_PRODUCT.name} collects and
          uses personal data.
        </p>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">1. Data We Collect</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Google OAuth profile (email, name, avatar) via Supabase Auth</li>
            <li>Subscription and billing metadata (Stripe/Danal — no full card numbers stored by us)</li>
            <li>Usage: scans, feature access, activity logs for security and product improvement</li>
            <li>Optional API keys you provide (e.g. Toss, Gemini) — stored per your settings</li>
            <li>IP Shield security events (host, user-agent, violation type) when triggered</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">2. How We Use Data</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Authenticate users and enforce membership tiers</li>
            <li>Process payments and support</li>
            <li>Improve reliability, detect abuse, and protect IP</li>
            <li>Analytics (Vercel Analytics; optional Google Analytics if enabled)</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">3. Processors & Hosting</h3>
          <p>
            Supabase (auth/database), Vercel (hosting), Stripe/Danal (payments), Google (OAuth,
            optional Gemini). Data may be processed in the US and other regions where these providers
            operate.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">4. Retention & Rights</h3>
          <p>
            Account data is retained while your account is active and as required by law. You may
            request access or deletion via {IP_OWNER.contactEmail}. Some billing records must be kept
            for tax/compliance.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">5. Security</h3>
          <p>
            We use HTTPS, RLS on database tables, tier-based entitlements, and IP Shield monitoring.
            No method is 100% secure; report issues to {IP_INVENTOR.email}.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">6. Contact</h3>
          <p>
            Data controller: {IP_OWNER.legalName} · {IP_OWNER.contactEmail}
          </p>
        </section>
      </article>
    );
  }

  return (
    <article className="prose prose-sm max-w-none space-y-6 text-muted-foreground dark:prose-invert">
      <p className="text-xs text-muted-foreground">최종 수정: 2026-06-27 · 버전 1.0</p>
      <h2 className="text-lg font-bold text-foreground">개인정보 처리방침</h2>
      <p>
        {IP_OWNER.legalName}(이하 &quot;테라브릿지&quot;)는 {IP_PRODUCT.name} 서비스 이용 시
        개인정보를 다음과 같이 처리합니다.
      </p>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">1. 수집 항목</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Google OAuth 프로필(이메일, 이름, 프로필 이미지) — Supabase Auth</li>
          <li>구독·결제 메타데이터(Stripe/Danal — 카드 전체 번호는 당사에 저장하지 않음)</li>
          <li>이용 기록: 스캔, 기능 접근, 보안·활동 로그</li>
          <li>이용자가 입력한 선택 API 키(토스, Gemini 등)</li>
          <li>IP Shield 보안 이벤트(호스트, User-Agent, 위반 유형)</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">2. 이용 목적</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 인증 및 등급별 기능 제공</li>
          <li>결제 처리 및 고객 지원</li>
          <li>서비스 안정성·남용 방지·IP 보호</li>
          <li>분석(Vercel Analytics, 선택적 Google Analytics)</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">3. 처리 위탁·호스팅</h3>
        <p>
          Supabase(인증·DB), Vercel(호스팅), Stripe/Danal(결제), Google(OAuth·선택 Gemini). 해당
          사업자의 리전(미국 등)에서 처리될 수 있습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">4. 보유 기간·권리</h3>
        <p>
          계정 유지 기간 및 관련 법령에 따라 보관합니다. 열람·삭제 요청은 {IP_OWNER.contactEmail}
          로 가능하며, 일부 결제 기록은 세무·준수 목적으로 보관됩니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">5. 보안</h3>
        <p>
          HTTPS, DB RLS, 등급별 권한, IP Shield 모니터링을 적용합니다. 취약점은 {IP_INVENTOR.email}
          로 신고해 주세요.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">6. 문의</h3>
        <p>
          개인정보 처리자: {IP_OWNER.legalName} · {IP_OWNER.contactEmail}
        </p>
      </section>
    </article>
  );
}
