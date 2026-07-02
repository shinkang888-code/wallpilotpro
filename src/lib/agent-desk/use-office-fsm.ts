import { useCallback, useEffect, useState } from "react";

import { getAgentDeskLatestFsm } from "@/lib/api/office.functions";
import type { OfficeFsmSnapshot } from "@/lib/office/office-fsm.server";

const POLL_MS = 3000;

export function useOfficeFsm(accessToken: string | null, guestId?: string) {
  const [snapshot, setSnapshot] = useState<OfficeFsmSnapshot | null>(null);
  const [streaming, setStreaming] = useState(false);

  const hasActor = !!accessToken || !!guestId;

  const refresh = useCallback(async () => {
    if (!hasActor) return;
    const snap = await getAgentDeskLatestFsm({ data: { accessToken, guestId } });
    setSnapshot(snap);
  }, [accessToken, guestId, hasActor]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!hasActor) return;

    const params = new URLSearchParams();
    if (accessToken) params.set("token", accessToken);
    if (guestId) params.set("guestId", guestId);
    const url = `/api/agent-desk/fsm-stream?${params.toString()}`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(url);
      setStreaming(true);
      es.addEventListener("snapshot", (ev) => {
        try {
          const snap = JSON.parse((ev as MessageEvent).data) as OfficeFsmSnapshot;
          setSnapshot(snap);
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        setStreaming(false);
        es?.close();
      };
    } catch {
      setStreaming(false);
    }

    return () => {
      es?.close();
      setStreaming(false);
    };
  }, [accessToken, guestId, hasActor]);

  return { snapshot, streaming, refresh };
}
