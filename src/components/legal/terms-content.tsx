// filepath: src/components/legal/terms-content.tsx
import { IP_OWNER, IP_PRODUCT } from "@/lib/ip/ownership";
import { LEGAL_DISCLAIMER_EN, LEGAL_DISCLAIMER_KO } from "@/lib/marketing/landing-copy";

export function TermsContent({ locale = "ko" }: { locale?: "ko" | "en" }) {
  if (locale === "en") {
    return (
      <article className="prose prose-sm max-w-none space-y-6 text-muted-foreground dark:prose-invert">
        <p className="text-xs text-muted-foreground">Last updated: 2026-06-27 · Version 1.0</p>
        <h2 className="text-lg font-bold text-foreground">Terms of Service</h2>
        <p>
          These Terms govern your use of {IP_PRODUCT.name} (&quot;Service&quot;), proprietary software
          owned by {IP_OWNER.legalName} (&quot;Terrabridge&quot;).
        </p>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">1. Nature of Service</h3>
          <p>
            The Service provides market data analysis, screening, and AI-generated reference content.
            It is <strong>not</strong> investment advice, a recommendation to buy or sell securities,
            or a registered investment adviser or broker-dealer service.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">2. User Responsibilities</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>You are solely responsible for investment decisions and outcomes.</li>
            <li>Cross-check AI output and model estimates against primary sources.</li>
            <li>Do not copy, clone, scrape, or reverse engineer the Service.</li>
            <li>Comply with applicable securities and data-use laws in your jurisdiction.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">3. Subscriptions & Billing</h3>
          <p>
            Paid tiers are billed via Stripe (US/international) or Danal (KR) where configured.
            Refund policy follows the plan shown at checkout. Terrabridge may change pricing with
            notice on the pricing page.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">4. Intellectual Property</h3>
          <p>
            All software, algorithms, UI, and branding are exclusive property of Terrabridge.
            Unauthorized reproduction or white-label use without a written license is prohibited.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">5. Limitation of Liability</h3>
          <p>
            The Service is provided &quot;as is.&quot; Terrabridge is not liable for trading losses,
            data delays, third-party API outages, or AI errors. Maximum liability is limited to fees
            paid in the prior 12 months.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">6. Contact</h3>
          <p>
            {IP_OWNER.legalName} · {IP_OWNER.contactEmail}
          </p>
        </section>
        <pre className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface/50 p-4 text-xs leading-relaxed">
          {LEGAL_DISCLAIMER_EN}
        </pre>
      </article>
    );
  }

  return (
    <article className="prose prose-sm max-w-none space-y-6 text-muted-foreground dark:prose-invert">
      <p className="text-xs text-muted-foreground">최종 수정: 2026-06-27 · 버전 1.0</p>
      <h2 className="text-lg font-bold text-foreground">이용약관</h2>
      <p>
        본 약관은 {IP_OWNER.legalName}(이하 &quot;테라브릿지&quot;)가 제공하는 {IP_PRODUCT.name}
        (이하 &quot;서비스&quot;) 이용에 관한 조건을 정합니다.
      </p>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">1. 서비스의 성격</h3>
        <p>
          서비스는 시장 데이터 분석, 스크리닝, AI 기반 참고 정보를 제공합니다. 투자자문업·투자일임업·
          집합투자업에 해당하지 않으며, 개별 종목의 매매를 권유·지시하지 않습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">2. 이용자 의무</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>투자 판단 및 손익에 대한 책임은 전적으로 이용자에게 있습니다.</li>
          <li>AI·모델 산출값은 공시·원천 데이터와 교차 확인해야 합니다.</li>
          <li>서비스의 무단 복제·클론·스크래핑·리버스 엔지니어링을 금지합니다.</li>
          <li>관련 법령 및 제3자 API 이용 조건을 준수해야 합니다.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">3. 요금 및 결제</h3>
        <p>
          유료 등급은 Stripe(해외) 또는 Danal(국내) 등 설정된 결제 수단으로 청구됩니다. 환불은
          결제 시점에 안내된 정책을 따르며, 요금 변경 시 사전 공지합니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">4. 지식재산권</h3>
        <p>
          소프트웨어·알고리즘·UI·브랜드는 테라브릿지의 독점 재산입니다. 서면 라이선스 없이
          화이트라벨·재배포·역설계를 할 수 없습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">5. 책임의 제한</h3>
        <p>
          서비스는 &quot;있는 그대로&quot; 제공됩니다. 투자 손실, 데이터 지연, 제3자 API 장애, AI
          오류에 대해 테라브릿지는 법령이 허용하는 범위 내에서 책임을 제한하며, 손해배상 상한은
          직전 12개월간 지급한 이용료를 초과하지 않습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">6. 문의</h3>
        <p>
          {IP_OWNER.legalName} · {IP_OWNER.contactEmail}
        </p>
      </section>
      <pre className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface/50 p-4 text-xs leading-relaxed">
        {LEGAL_DISCLAIMER_KO}
      </pre>
    </article>
  );
}
