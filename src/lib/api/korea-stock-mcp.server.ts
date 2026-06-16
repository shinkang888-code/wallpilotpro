import { getServerConfig } from "@/lib/config.server";
import type { McpSupplyDemandSnapshot } from "@/lib/quant/analyzers/supply-demand.server";

type PythonSuccess<T> = { success: true; data: T };
type PythonFailure = { success: false; error?: { message?: string } };

export type McpFinancialSnapshot = {
  ticker: string;
  metrics: {
    per: number | null;
    pbr: number | null;
    eps: number | null;
    bps: number | null;
    roe: number | null;
    dividendYield: number | null;
  };
  yearly?: Array<{
    year: number;
    eps: number | null;
    per: number | null;
    pbr: number | null;
    dividendYield: number | null;
  }>;
};

async function callStockData<T>(method: string, params: Record<string, unknown>): Promise<T | null> {
  const { koreaStockMcpUrl } = getServerConfig();
  try {
    const res = await fetch(`${koreaStockMcpUrl}/api/stock_data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as PythonSuccess<T> | PythonFailure;
    if (!json.success) return null;
    return json.data;
  } catch {
    return null;
  }
}

export async function fetchKrFinancial(ticker: string, years = 3): Promise<McpFinancialSnapshot | null> {
  const code = ticker.replace(/\.KS$|\.KQ$/, "");
  return callStockData<McpFinancialSnapshot>("getFinancialData", { ticker: code, years });
}

export type McpMarketSnapshot = {
  ticker: string;
  marketCap: number | null;
  close: number | null;
};

export async function fetchKrMarket(ticker: string): Promise<McpMarketSnapshot | null> {
  const code = ticker.replace(/\.KS$|\.KQ$/, "");
  return callStockData<McpMarketSnapshot>("getMarketData", { ticker: code });
}

export async function fetchKrSupplyDemand(
  ticker: string,
  days = 30,
): Promise<McpSupplyDemandSnapshot | null> {
  const code = ticker.replace(/\.KS$|\.KQ$/, "");
  return callStockData<McpSupplyDemandSnapshot>("getSupplyDemand", { ticker: code, days });
}

export function epsGrowth3yFromYearly(financial: McpFinancialSnapshot | null): number | null {
  const yearly = financial?.yearly;
  if (!yearly || yearly.length < 2) return null;
  const current = yearly[0]?.eps;
  const oldest = yearly[Math.min(yearly.length - 1, 2)]?.eps;
  if (!current || !oldest || oldest <= 0) return null;
  const years = Math.min(yearly.length - 1, 3);
  return round1((Math.pow(current / oldest, 1 / years) - 1) * 100);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
