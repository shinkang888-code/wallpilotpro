import { getServerConfig } from "@/lib/config.server";

export type TossCredentials = {
  clientId: string;
  clientSecret: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: { key: string; token: CachedToken } | null = null;

/** Resolve OAuth client credentials from env and/or per-request tossKey. */
export function resolveTossCredentials(tossKey?: string | null): TossCredentials | null {
  const cfg = getServerConfig();
  const raw = tossKey?.trim();

  if (raw?.includes(":")) {
    const idx = raw.indexOf(":");
    const clientId = raw.slice(0, idx).trim();
    const clientSecret = raw.slice(idx + 1).trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
  }

  const clientId = cfg.tossClientId;
  const clientSecret = raw || cfg.tossClientSecret;
  if (clientId && clientSecret) return { clientId, clientSecret };
  return null;
}

/** OAuth2 client_credentials access token (cached until expiry). */
export async function getTossAccessToken(
  creds: TossCredentials,
): Promise<string | null> {
  const cacheKey = `${creds.clientId}:${creds.clientSecret.slice(0, 12)}`;
  const now = Date.now();
  if (tokenCache?.key === cacheKey && tokenCache.token.expiresAt > now + 60_000) {
    return tokenCache.token.accessToken;
  }

  const { tossApiBaseUrl } = getServerConfig();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  try {
    const res = await fetch(`${tossApiBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) return null;
    tokenCache = {
      key: cacheKey,
      token: {
        accessToken: json.access_token,
        expiresAt: now + (json.expires_in ?? 3600) * 1000,
      },
    };
    return json.access_token;
  } catch {
    return null;
  }
}

/** Bearer token for Toss Open API (null when credentials are missing or invalid). */
export async function getTossBearerToken(
  tossKey?: string | null,
): Promise<string | null> {
  const creds = resolveTossCredentials(tossKey);
  if (!creds) return null;
  return getTossAccessToken(creds);
}
