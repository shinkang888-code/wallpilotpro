import { getServerConfig } from "@/lib/config.server";

export type TossWallet = { krw: number; usd: number };

/** Toss Open API bridge — token travels per-request, never persisted server-side. */
export async function fetchTossWallet(accessToken: string): Promise<TossWallet | null> {
  const { tossApiBaseUrl } = getServerConfig();
  try {
    const res = await fetch(`${tossApiBaseUrl}/v1/account/balance`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      krw_balance?: number;
      usd_balance?: number;
      total_krw?: number;
      total_usd?: number;
    };
    return {
      krw: json.krw_balance ?? json.total_krw ?? 0,
      usd: json.usd_balance ?? json.total_usd ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchTossQuote(
  accessToken: string,
  ticker: string,
  market: "KR" | "US",
): Promise<number | null> {
  const { tossApiBaseUrl } = getServerConfig();
  try {
    const res = await fetch(
      `${tossApiBaseUrl}/v1/market/quote?symbol=${encodeURIComponent(ticker)}&market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { price?: number; last?: number };
    return json.price ?? json.last ?? null;
  } catch {
    return null;
  }
}

export type SplitLimitOrder = {
  ticker: string;
  market: "KR" | "US";
  totalQty: number;
  zoneLow: number;
  zoneHigh: number;
  splits: [number, number, number];
};

export async function placeSplitLimitOrder(
  accessToken: string,
  order: SplitLimitOrder,
): Promise<{ ok: boolean; orderIds: string[]; message: string }> {
  const { tossApiBaseUrl } = getServerConfig();
  const [a, b, c] = order.splits;
  const total = a + b + c;
  const qtys = [
    Math.floor((order.totalQty * a) / total),
    Math.floor((order.totalQty * b) / total),
    order.totalQty - Math.floor((order.totalQty * a) / total) - Math.floor((order.totalQty * b) / total),
  ];
  const step = (order.zoneHigh - order.zoneLow) / 2;
  const prices = [order.zoneLow, order.zoneLow + step, order.zoneHigh];
  const orderIds: string[] = [];

  for (let i = 0; i < 3; i++) {
    if (qtys[i] <= 0) continue;
    try {
      const res = await fetch(`${tossApiBaseUrl}/v1/order/limit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          symbol: order.ticker,
          market: order.market,
          side: "buy",
          quantity: qtys[i],
          price: Math.round(prices[i]! * 100) / 100,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { order_id?: string; id?: string };
        orderIds.push(body.order_id ?? body.id ?? `split-${i}`);
      }
    } catch {
      /* continue other legs */
    }
  }

  return {
    ok: orderIds.length > 0,
    orderIds,
    message:
      orderIds.length > 0
        ? `Routed ${orderIds.length} split-limit legs to Toss`
        : "Toss API unavailable — verify token and TOSS_API_BASE_URL",
  };
}
