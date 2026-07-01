import { useCallback, useEffect, useState } from "react";

import {
  getAgentDeskCompany,
  getAgentDeskEvents,
  runAgentDeskSiteCheck,
} from "@/lib/api/office.functions";
import { getAniStudioBindings } from "@/lib/api/anistudio.functions";
import type { BuildingRouteBinding } from "@/lib/anistudio/building-binding";
import type { CompanyData, OfficeEvent } from "@/lib/office/types";

const POLL_MS = 15_000;

export function useAgentDesk(accessToken: string | null) {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [routeBindings, setRouteBindings] = useState<Record<string, BuildingRouteBinding>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, e, ani] = await Promise.all([
        getAgentDeskCompany({ data: { accessToken } }),
        getAgentDeskEvents({ data: { accessToken } }),
        getAniStudioBindings({ data: { accessToken } }),
      ]);
      setCompany(c);
      setEvents(e);
      const map: Record<string, BuildingRouteBinding> = {};
      for (const b of ani.bindings ?? []) {
        if (b.departmentSlug) map[b.departmentSlug] = b;
      }
      setRouteBindings(map);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const runSiteCheck = useCallback(async () => {
    if (!accessToken) return;
    setChecking(true);
    try {
      const { sites } = await runAgentDeskSiteCheck({ data: { accessToken } });
      setCompany((prev) => (prev ? { ...prev, sites } : prev));
      await refresh();
    } finally {
      setChecking(false);
    }
  }, [accessToken, refresh]);

  return { company, events, routeBindings, loading, checking, refresh, runSiteCheck };
}
