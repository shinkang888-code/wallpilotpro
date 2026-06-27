import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { logIpViolation } from "./lib/db/ip-violation.server";
import { evaluateRequest } from "./lib/security/ip-shield.server";

const ipShieldMiddleware = createMiddleware().server(async ({ request, next }) => {
  const shield = evaluateRequest(request);
  if (shield.verdict === "warn" && shield.reasons.length > 0) {
    void logIpViolation({
      violationType: shield.reasons.includes("foreign_referer")
        ? "clone_embed"
        : "foreign_origin",
      host: shield.host,
      origin: shield.origin,
      referer: shield.referer,
      userAgent: shield.userAgent,
      detail: { path: shield.url.pathname, reasons: shield.reasons, level: "warn" },
    });
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [ipShieldMiddleware, errorMiddleware],
}));
