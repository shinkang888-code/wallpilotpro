import { getServerConfig } from "@/lib/config.server";
import {
  fetchLivePrice,
  fetchYahooLivePrice,
  toTossSymbol,
} from "@/lib/market/price-provider.server";
import { getTossBearerToken } from "@/lib/market/toss-auth.server";

export type TossWallet = { krw: number; usd: number };

async function tossHeaders(accessToken: string): Promise<Record<string, string> | null> {
  const bearer = (await getTossBearerToken(accessToken)) ?? accessToken;
  if (!bearer) return null;
  return {
    Authorization: `Bearer ${bearer}`,
    Accept: "application/json",
  };
}

/** Toss Open API bridge — credentials travel per-request, never persisted server-side. */
export async function fetchTossWallet(accessToken: string): Promise<TossWallet | null> {
  const { tossApiBaseUrl } = getServerConfig();
  const headers = await tossHeaders(accessToken);
  if (!headers) return null;

  try {
    const accountsRes = await fetch(`${tossApiBaseUrl}/api/v1/accounts`, { headers });
    if (!accountsRes.ok) return null;
    const accountsJson = (await accountsRes.json()) as {
      result?: Array<{ accountSeq?: number }>;
    };
    const accountSeq = accountsJson.result?.[0]?.accountSeq;
    if (accountSeq == null) return null;

    const bpRes = await fetch(`${tossApiBaseUrl}/api/v1/buying-power`, {
      headers: {
        ...headers,
        "X-Tossinvest-Account": String(accountSeq),
      },
    });
    if (!bpRes.ok) return null;
    const bpJson = (await bpRes.json()) as {
      result?: { cashBuyingPower?: string; currency?: string };
    };
    const cash = Number.parseFloat(bpJson.result?.cashBuyingPower ?? "0");
    if (!Number.isFinite(cash)) return { krw: 0, usd: 0 };
    if (bpJson.result?.currency === "USD") return { krw: 0, usd: cash };
    return { krw: cash, usd: 0 };
  } catch {
    return null;
  }
}

export async function fetchTossQuote(
  accessToken: string,
  ticker: string,
  market: "KR" | "US",
): Promise<number | null> {
  const live = await fetchLivePrice(ticker, market, { tossKey: accessToken });
  return live?.source === "toss" ? live.price : null;
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
  const headers = await tossHeaders(accessToken);
  if (!headers) {
    return {
      ok: false,
      orderIds: [],
      message: "Toss API unavailable — verify client_id/client_secret or tossKey",
    };
  }

  const [a, b, c] = order.splits;
  const total = a + b + c;
  const qtys = [
    Math.floor((order.totalQty * a) / total),
    Math.floor((order.totalQty * b) / total),
    order.totalQty -
      Math.floor((order.totalQty * a) / total) -
      Math.floor((order.totalQty * b) / total),
  ];
  const step = (order.zoneHigh - order.zoneLow) / 2;
  const prices = [order.zoneLow, order.zoneLow + step, order.zoneHigh];
  const orderIds: string[] = [];
  const symbol = toTossSymbol(order.ticker, order.market);

  for (let i = 0; i < 3; i++) {
    if (qtys[i] <= 0) continue;
    try {
      const res = await fetch(`${tossApiBaseUrl}/v1/order/limit`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
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

export { fetchYahooLivePrice };
