import { useEffect } from "react";

import { reportIpViolation } from "@/lib/api/ip-shield.functions";
import { IP_COPYRIGHT_LINE, IP_OWNER, IP_PRODUCT, IP_WARNING_SHORT } from "@/lib/ip/ownership";

function fingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const parts = [
    navigator.language,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return parts.join("|").slice(0, 128);
}

/** Client-side clone/embed detection and lightweight copy deterrent. */
export function IpShieldGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.host;
    const origin = window.location.origin;

    // Embedded in foreign iframe → clone / scrape attempt
    try {
      if (window.self !== window.top) {
        const topHost = window.top?.location.host;
        if (topHost && topHost !== host) {
          void reportIpViolation({
            data: {
              violationType: "clone_embed",
              host,
              origin,
              fingerprint: fingerprint(),
              detail: { topHost },
            },
          });
        }
      }
    } catch {
      // Cross-origin iframe — treat as embed attempt
      void reportIpViolation({
        data: {
          violationType: "clone_embed",
          host,
          origin,
          fingerprint: fingerprint(),
          detail: { crossOriginIframe: true },
        },
      });
    }

    const onCopy = () => {
      void reportIpViolation({
        data: {
          violationType: "copy_attempt",
          host,
          origin,
          fingerprint: fingerprint(),
          detail: { path: window.location.pathname },
        },
      });
    };

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-wallpilot-protected]")) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // DevTools shortcuts (best-effort deterrent, not foolproof)
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.metaKey && e.altKey && e.key === "I")
      ) {
        void reportIpViolation({
          data: {
            violationType: "devtools_probe",
            host,
            origin,
            fingerprint: fingerprint(),
          },
        });
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      {/* Invisible ownership watermark for HTML source inspection */}
      <div
        aria-hidden
        hidden
        data-wallpilot-ip={IP_OWNER.legalName}
        data-wallpilot-inventor="kangjunchul8@gmail.com"
        data-wallpilot-product={IP_PRODUCT.name}
      />
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-[9999] select-none opacity-[0.04] text-[10px] text-foreground"
        aria-hidden
      >
        {IP_COPYRIGHT_LINE} · {IP_WARNING_SHORT}
      </div>
    </>
  );
}
