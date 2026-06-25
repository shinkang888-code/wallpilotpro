import { useCallback, useEffect, useMemo, useState } from "react";

const CLIENT_ID_KEY = "wallpilot.toss.clientId";
const CLIENT_SECRET_KEY = "wallpilot.toss.clientSecret";
const LEGACY_KEY = "wallpilot.toss.key";
const LEGACY_ALPHA_KEY = "alphareverse.toss.key";

export type TossApiCredentials = {
  clientId: string;
  clientSecret: string;
};

function readLegacy(): Partial<TossApiCredentials> | null {
  try {
    const legacy =
      window.localStorage.getItem(LEGACY_KEY) ??
      window.localStorage.getItem(LEGACY_ALPHA_KEY);
    if (!legacy) return null;
    if (legacy.includes(":")) {
      const idx = legacy.indexOf(":");
      return {
        clientId: legacy.slice(0, idx).trim(),
        clientSecret: legacy.slice(idx + 1).trim(),
      };
    }
    return { clientSecret: legacy.trim() };
  } catch {
    return null;
  }
}

function readStored(): TossApiCredentials | null {
  try {
    let clientId = window.localStorage.getItem(CLIENT_ID_KEY)?.trim() ?? "";
    let clientSecret = window.localStorage.getItem(CLIENT_SECRET_KEY)?.trim() ?? "";

    if (!clientId && !clientSecret) {
      const legacy = readLegacy();
      if (legacy) {
        clientId = legacy.clientId ?? "";
        clientSecret = legacy.clientSecret ?? "";
        if (clientId) window.localStorage.setItem(CLIENT_ID_KEY, clientId);
        if (clientSecret) window.localStorage.setItem(CLIENT_SECRET_KEY, clientSecret);
        window.localStorage.removeItem(LEGACY_KEY);
        window.localStorage.removeItem(LEGACY_ALPHA_KEY);
      }
    }

    if (clientId && clientSecret) return { clientId, clientSecret };
    return null;
  } catch {
    return null;
  }
}

function persist(creds: TossApiCredentials | null) {
  try {
    if (!creds) {
      window.localStorage.removeItem(CLIENT_ID_KEY);
      window.localStorage.removeItem(CLIENT_SECRET_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      return;
    }
    window.localStorage.setItem(CLIENT_ID_KEY, creds.clientId);
    window.localStorage.setItem(CLIENT_SECRET_KEY, creds.clientSecret);
    window.localStorage.setItem(LEGACY_KEY, `${creds.clientId}:${creds.clientSecret}`);
  } catch {}
}

/** Combined `clientId:clientSecret` for server-side Toss OAuth. */
export function tossApiKeyFromCredentials(creds: TossApiCredentials): string {
  return `${creds.clientId}:${creds.clientSecret}`;
}

export function useTossApiKey() {
  const [credentials, setCredentials] = useState<TossApiCredentials | null>(null);

  useEffect(() => {
    setCredentials(readStored());
  }, []);

  const save = useCallback((clientId: string, clientSecret: string) => {
    const next: TossApiCredentials = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    };
    setCredentials(next);
    persist(next);
  }, []);

  const clear = useCallback(() => {
    setCredentials(null);
    persist(null);
  }, []);

  const key = useMemo(
    () => (credentials ? tossApiKeyFromCredentials(credentials) : null),
    [credentials],
  );

  return {
    clientId: credentials?.clientId ?? null,
    clientSecret: credentials?.clientSecret ?? null,
    /** Server requests — `clientId:clientSecret` */
    key,
    save,
    clear,
    isConnected: Boolean(credentials?.clientId && credentials?.clientSecret),
  };
}
