import { getServerConfig } from "@/lib/config.server";
import { IP_OWNER, IP_PRODUCT } from "@/lib/ip/ownership";

export type IpShieldVerdict = "allow" | "block" | "warn";

export type IpShieldContext = {
  url: URL;
  origin: string | null;
  referer: string | null;
  host: string | null;
  userAgent: string | null;
  verdict: IpShieldVerdict;
  reasons: string[];
};

const SCRAPER_UA =
  /curl|wget|scrapy|python-requests|httpx|go-http-client|java\/|libwww|headlesschrome|phantomjs|semrush|ahrefs|bytespider|petalbot/i;

function parseAllowedOrigins(): Set<string> {
  const { authSiteUrl } = getServerConfig();
  const raw = process.env.WALLPILOT_ALLOWED_ORIGINS ?? "";
  const hosts = new Set<string>();

  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    try {
      hosts.add(new URL(part).host.toLowerCase());
    } catch {
      hosts.add(part.toLowerCase().replace(/^https?:\/\//, ""));
    }
  }

  if (authSiteUrl) {
    try {
      hosts.add(new URL(authSiteUrl).host.toLowerCase());
    } catch {
      /* ignore */
    }
  }

  if (process.env.VERCEL_URL) {
    hosts.add(process.env.VERCEL_URL.toLowerCase());
  }

  hosts.add("localhost");
  hosts.add("127.0.0.1");

  return hosts;
}

export function getSiteBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.WALLPILOT_BUILD_ID ??
    "dev"
  );
}

export function evaluateRequest(request: Request): IpShieldContext {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const userAgent = request.headers.get("user-agent");
  const reasons: string[] = [];
  let verdict: IpShieldVerdict = "allow";

  const allowed = parseAllowedOrigins();
  const path = url.pathname;

  // Public assets & auth callbacks stay reachable
  const isPublicPath =
    path.startsWith("/assets/") ||
    path.startsWith("/icon") ||
    path.startsWith("/logo") ||
    path === "/manifest.webmanifest" ||
    path === "/robots.txt" ||
    path.startsWith("/.well-known/") ||
    path === "/api/stripe/webhook";

  if (!isPublicPath && userAgent && SCRAPER_UA.test(userAgent)) {
    reasons.push("scraper_user_agent");
    verdict = "block";
  }

  if (!isPublicPath && origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (host && originHost !== host.toLowerCase() && !allowed.has(originHost)) {
        reasons.push("foreign_origin");
        verdict = verdict === "block" ? "block" : "warn";
      }
    } catch {
      reasons.push("malformed_origin");
      verdict = "warn";
    }
  }

  if (!isPublicPath && referer) {
    try {
      const refHost = new URL(referer).host.toLowerCase();
      if (host && refHost !== host.toLowerCase() && !allowed.has(refHost)) {
        reasons.push("foreign_referer");
        if (verdict !== "block") verdict = "warn";
      }
    } catch {
      /* ignore */
    }
  }

  return { url, origin, referer, host, userAgent, verdict, reasons };
}

export function applyIpShieldHeaders(response: Response, request: Request): Response {
  const buildId = getSiteBuildId();
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.tossinvest.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  headers.set("X-WallPilot-Build", buildId);
  headers.set("X-WallPilot-Owner", IP_OWNER.legalName);
  headers.set("X-WallPilot-Product", IP_PRODUCT.name);
  headers.set(
    "X-WallPilot-Notice",
    "Proprietary - Terrabridge Capital Inc. Unauthorized cloning prohibited.",
  );

  const ctx = evaluateRequest(request);
  if (ctx.verdict !== "allow") {
    headers.set("X-WallPilot-Shield", ctx.verdict);
    headers.set("X-WallPilot-Shield-Reason", ctx.reasons.join(","));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function cloneBlockResponse(ctx: IpShieldContext): Response {
  return new Response(
    JSON.stringify({
      error: "forbidden",
      message: "WallPilot Pro is proprietary software. Unauthorized access or cloning is prohibited.",
      owner: IP_OWNER.legalName,
      contact: IP_OWNER.contactEmail,
      reasons: ctx.reasons,
    }),
    {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-WallPilot-Shield": "block",
      },
    },
  );
}
