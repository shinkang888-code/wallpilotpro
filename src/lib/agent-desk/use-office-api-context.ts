import { useEffect, useState } from "react";

import { getOfficeGuestId } from "@/lib/agent-desk/guest-id";
import { useAuth } from "@/lib/use-auth";

/** 로그인 시 userId, 비회원 체험 시 guestId를 API에 전달 */
export function useOfficeApiContext() {
  const { accessToken } = useAuth();
  const [guestId, setGuestId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return getOfficeGuestId();
  });

  useEffect(() => {
    if (!accessToken) {
      setGuestId(getOfficeGuestId());
    } else {
      setGuestId(undefined);
    }
  }, [accessToken]);

  return { accessToken, guestId };
}
