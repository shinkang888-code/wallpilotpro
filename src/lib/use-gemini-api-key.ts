import { useEffect, useState } from "react";

const STORAGE_KEY = "wallpilot.gemini.key";

function readStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useGeminiApiKey() {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    setKey(readStoredKey());
  }, []);

  const save = (value: string) => {
    const trimmed = value.trim();
    setKey(trimmed);
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
  };

  const clear = () => {
    setKey(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return { key, save, clear, isConnected: Boolean(key) };
}
