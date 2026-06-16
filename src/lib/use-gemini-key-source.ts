import { useCallback, useEffect, useState } from "react";

import { getGeminiStatus } from "@/lib/api/gemini-connect.functions";
import type { GeminiKeySource } from "@/lib/gemini/gemini-key-resolution";
import {
  clearGeminiRedeployPending,
  markGeminiRedeployPending,
  readGeminiRedeployPending,
} from "@/lib/gemini/gemini-redeploy-pending";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useVercelCredentials } from "@/lib/use-vercel-credentials";

export function useGeminiKeySource() {
  const { key } = useGeminiApiKey();
  const vercel = useVercelCredentials();
  const [source, setSource] = useState<GeminiKeySource>("none");
  const [vercelConfigured, setVercelConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeployPending, setRedeployPending] = useState(false);

  useEffect(() => {
    setRedeployPending(readGeminiRedeployPending().pending);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Wrap in an extra try so any unexpected serialization / network /
      // 500 HTML page from a stale deployment can't escape and blank the UI.
      const status = await getGeminiStatus({
        data: {
          ...(vercel.overrides ?? {}),
          geminiApiKey: key ?? undefined,
        },
      }).catch((err) => {
        console.warn("[gemini-status] fetch failed, defaulting to local-only", err);
        return null;
      });

      if (status) {
        setSource(status.activeSource);
        setVercelConfigured(status.configured);
        if (status.activeSource === "vercel") {
          clearGeminiRedeployPending();
          setRedeployPending(false);
        } else {
          setRedeployPending(readGeminiRedeployPending().pending);
        }
      } else {
        // Fallback: if the user has a client-side key, treat it as the active source.
        setSource(key ? "local" : "none");
        setVercelConfigured(false);
        setRedeployPending(readGeminiRedeployPending().pending);
      }
    } catch (err) {
      console.warn("[gemini-status] unexpected error", err);
      setSource(key ? "local" : "none");
      setVercelConfigured(false);
      setRedeployPending(readGeminiRedeployPending().pending);
    } finally {
      setLoading(false);
    }
  }, [key, vercel.overrides]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRedeployPending = useCallback(() => {
    markGeminiRedeployPending();
    setRedeployPending(true);
  }, []);

  const localConfigured = Boolean(key);
  const localOnly = localConfigured && !vercelConfigured;
  const isRedeployPending = redeployPending && source !== "vercel";

  return {
    source,
    vercelConfigured,
    localConfigured,
    localOnly,
    redeployPending: isRedeployPending,
    hasActiveKey: source !== "none",
    loading,
    refresh,
    markRedeployPending,
  };
}
