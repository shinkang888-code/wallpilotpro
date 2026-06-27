// filepath: src/components/analytics/site-analytics.tsx
import { useEffect, useState } from "react";

type AnalyticsModule = { Analytics: React.ComponentType };

/** Vercel Web Analytics + optional GA4 via VITE_GA_MEASUREMENT_ID */
export function SiteAnalytics() {
  const [VercelAnalytics, setVercelAnalytics] = useState<AnalyticsModule["Analytics"] | null>(
    null,
  );

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
    if (gaId && typeof window !== "undefined" && !document.getElementById("ga4-script")) {
      const s = document.createElement("script");
      s.id = "ga4-script";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(s);
      const inline = document.createElement("script");
      inline.id = "ga4-inline";
      inline.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', { send_page_view: true });
      `;
      document.head.appendChild(inline);
    }

    void import("@vercel/analytics/react")
      .then((mod) => setVercelAnalytics(() => mod.Analytics))
      .catch(() => undefined);
  }, []);

  if (!VercelAnalytics) return null;
  return <VercelAnalytics />;
}
