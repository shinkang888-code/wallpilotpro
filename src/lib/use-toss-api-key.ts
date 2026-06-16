import { useEffect, useState } from "react";

const KEY = "wallpilot.toss.key";
const LEGACY_KEY = "alphareverse.toss.key";

export function useTossApiKey() {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      let v = window.localStorage.getItem(KEY);
      if (!v) {
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          window.localStorage.setItem(KEY, legacy);
          window.localStorage.removeItem(LEGACY_KEY);
          v = legacy;
        }
      }
      if (v) setKey(v);
    } catch {}
  }, []);

  const save = (v: string) => {
    setKey(v);
    try {
      window.localStorage.setItem(KEY, v);
    } catch {}
  };

  const clear = () => {
    setKey(null);
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
  };

  return { key, save, clear, isConnected: Boolean(key) };
}
