import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { logIpViolation, type IpViolationType } from "@/lib/db/ip-violation.server";
import { getSiteBuildId } from "@/lib/security/ip-shield.server";
import { publicIpManifest } from "@/lib/ip/ownership";

export const getIpManifest = createServerFn({ method: "GET" }).handler(async () => {
  return publicIpManifest(getSiteBuildId());
});

export const reportIpViolation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      violationType: z.enum([
        "clone_embed",
        "foreign_origin",
        "scraper_ua",
        "copy_attempt",
        "devtools_probe",
      ]),
      host: z.string().max(256).optional(),
      origin: z.string().max(512).optional(),
      referer: z.string().max(512).optional(),
      fingerprint: z.string().max(128).optional(),
      detail: z.record(z.unknown()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await logIpViolation({
      violationType: data.violationType as IpViolationType,
      host: data.host,
      origin: data.origin,
      referer: data.referer,
      fingerprint: data.fingerprint,
      detail: data.detail,
    });
    return { ok: true };
  });
