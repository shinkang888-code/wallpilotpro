import { Link } from "@tanstack/react-router";

import { IP_COPYRIGHT_LINE, IP_INVENTOR, IP_OWNER, IP_PRODUCT, IP_WARNING_SHORT } from "@/lib/ip/ownership";
import { LEGAL_DISCLAIMER_KO } from "@/lib/marketing/landing-copy";

export function LegalFooter() {
  return (
    <footer
      className="border-t border-hairline/60 bg-background/80 px-4 py-6 text-center text-xs text-muted-foreground"
      data-wallpilot-protected
    >
      <p className="font-medium text-foreground/80">{IP_PRODUCT.mark}</p>
      <p className="mt-1">{IP_COPYRIGHT_LINE}</p>
      <p className="mt-1">
        Owner: {IP_OWNER.legalName} ({IP_OWNER.contactEmail}) · Inventor: {IP_INVENTOR.email}
      </p>
      <p className="mt-2 max-w-2xl mx-auto leading-relaxed whitespace-pre-line text-[11px]">
        {LEGAL_DISCLAIMER_KO.split("\n\n")[0]}
      </p>
      <p className="mt-2 max-w-2xl mx-auto leading-relaxed">{IP_WARNING_SHORT}</p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
          이용약관
        </Link>
        <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
          개인정보처리방침
        </Link>
        <a
          href="/.well-known/wallpilot-ip.json"
          className="underline underline-offset-2 hover:text-foreground"
          rel="noopener noreferrer"
        >
          IP & Licensing
        </a>
      </p>
    </footer>
  );
}
