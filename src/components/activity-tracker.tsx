import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { trackActivity } from "@/lib/api/activity.functions";
import { menuByPath } from "@/lib/membership/menus";
import { useAuth } from "@/lib/use-auth";

/** Logs page_view events for authenticated active users. */
export function ActivityTracker() {
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!auth.accessToken || !auth.isActive) return;
    if (pathname.startsWith("/admin")) return;

    const menu = menuByPath(pathname);
    void trackActivity({
      data: {
        accessToken: auth.accessToken,
        eventType: "page_view",
        menuId: menu?.id,
        detail: { path: pathname },
      },
    });
  }, [pathname, auth.accessToken, auth.isActive]);

  return null;
}
