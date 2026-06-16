import { getServerConfig } from "@/lib/config.server";
import { resolveCorpCode } from "@/lib/modules/dart/corp-code.server";
import type {
  DartCompanyProfile,
  DartDisclosure,
  DartFinancialRow,
  DartFinancialSnapshot,
  DartKeyMetrics,
} from "@/lib/modules/dart/types";

const OPENDART = "https://opendart.fss.or.kr/api";

type OpenDartResponse = {
  status: string;
  message: string;
  [key: string]: unknown;
};

function apiKey(): string {
  return getServerConfig().opendartApiKey;
}

export function isOpenDartConfigured(): boolean {
  return Boolean(apiKey());
}

async function dartGet<T extends OpenDartResponse>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("opendart_not_configured");

  const qs = new URLSearchParams({ crtfc_key: key, ...params });
  const res = await fetch(`${OPENDART}/${path}?${qs}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`opendart_http_${res.status}`);
  const json = (await res.json()) as T;
  if (json.status !== "000") throw new Error(json.message || `opendart_${json.status}`);
  return json;
}

function parseAmount(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "-") return null;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function dartViewerUrl(rceptNo: string): string {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
}

export async function fetchDartCompany(stockCode: string): Promise<DartCompanyProfile> {
  const key = apiKey();
  const resolved = await resolveCorpCode(stockCode, key);
  if (!resolved) throw new Error("dart_corp_not_found");

  const json = await dartGet<OpenDartResponse & Record<string, string>>("company.json", {
    corp_code: resolved.corpCode,
  });

  return {
    corpCode: resolved.corpCode,
    corpName: json.corp_name ?? resolved.corpName ?? stockCode,
    stockCode: resolved.stockCode,
    ceoNm: json.ceo_nm,
    indutyCode: json.induty_code,
    estDt: json.est_dt,
    hmUrl: json.hm_url,
    corpCls: json.corp_cls,
  };
}

export async function fetchDartDisclosures(
  stockCode: string,
  days = 180,
  pageCount = 20,
): Promise<DartDisclosure[]> {
  const key = apiKey();
  const resolved = await resolveCorpCode(stockCode, key);
  if (!resolved) throw new Error("dart_corp_not_found");

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const json = await dartGet<
    OpenDartResponse & {
      list?: Array<Record<string, string>>;
    }
  >("list.json", {
    corp_code: resolved.corpCode,
    bgn_de: fmt(start),
    end_de: fmt(end),
    page_no: "1",
    page_count: String(pageCount),
  });

  return (json.list ?? []).map((row) => ({
    rceptNo: row.rcept_no,
    corpName: row.corp_name ?? resolved.corpName,
    stockCode: row.stock_code?.padStart(6, "0") ?? resolved.stockCode,
    reportNm: row.report_nm,
    rceptDt: row.rcept_dt,
    flrNm: row.flr_nm,
    dartUrl: dartViewerUrl(row.rcept_no),
  }));
}

export async function fetchDartFinancials(
  stockCode: string,
  bsnsYear?: string,
): Promise<DartFinancialSnapshot | null> {
  const key = apiKey();
  const resolved = await resolveCorpCode(stockCode, key);
  if (!resolved) throw new Error("dart_corp_not_found");

  const year = bsnsYear ?? String(new Date().getFullYear() - 1);
  const json = await dartGet<
    OpenDartResponse & {
      list?: Array<Record<string, string>>;
    }
  >("fnlttSinglAcntAll.json", {
    corp_code: resolved.corpCode,
    bsns_year: year,
    reprt_code: "11011",
    fs_div: "CFS",
  });

  const rows: DartFinancialRow[] = (json.list ?? []).map((row) => ({
    accountNm: row.account_nm,
    currentAmount: parseAmount(row.thstrm_amount),
    priorAmount: parseAmount(row.frmtrm_amount),
    sjDiv: row.sj_div,
  }));

  if (!rows.length) return null;

  return {
    bsnsYear: year,
    reprtCode: "11011",
    reprtName: "사업보고서",
    fsDiv: "CFS",
    rows,
  };
}

function findAccountAmount(rows: DartFinancialRow[], keywords: string[], sjDiv?: string): number | null {
  for (const kw of keywords) {
    const hit = rows.find(
      (r) => r.accountNm.includes(kw) && (!sjDiv || r.sjDiv === sjDiv || r.sjDiv.includes(sjDiv)),
    );
    if (hit?.currentAmount != null) return hit.currentAmount;
  }
  return null;
}

function findBsAmount(rows: DartFinancialRow[], keywords: string[]): number | null {
  return findAccountAmount(rows, keywords, "BS");
}

export function computeDartMetrics(financials: DartFinancialSnapshot | null): DartKeyMetrics {
  if (!financials) {
    return {
      revenue: null,
      operatingIncome: null,
      netIncome: null,
      totalAssets: null,
      totalLiabilities: null,
      totalEquity: null,
      debtRatio: null,
      operatingMargin: null,
      roe: null,
      currentRatio: null,
    };
  }

  const { rows } = financials;
  const revenue = findAccountAmount(rows, ["매출액", "수익(매출액)", "영업수익"], "IS");
  const operatingIncome = findAccountAmount(rows, ["영업이익", "영업손실"], "IS");
  const netIncome = findAccountAmount(
    rows,
    ["당기순이익", "분기순이익", "지배기업소유주지분에 귀속"],
    "IS",
  );
  const totalAssets = findBsAmount(rows, ["자산총계"]);
  const totalLiabilities = findBsAmount(rows, ["부채총계"]);
  const totalEquity = findBsAmount(rows, ["자본총계", "지배기업소유주지분"]);
  const currentAssets = findBsAmount(rows, ["유동자산"]);
  const currentLiabilities = findBsAmount(rows, ["유동부채"]);

  const debtRatio =
    totalLiabilities != null && totalEquity != null && totalEquity !== 0
      ? (totalLiabilities / totalEquity) * 100
      : null;
  const operatingMargin =
    operatingIncome != null && revenue != null && revenue !== 0
      ? (operatingIncome / revenue) * 100
      : null;
  const roe =
    netIncome != null && totalEquity != null && totalEquity !== 0
      ? (netIncome / totalEquity) * 100
      : null;
  const currentRatio =
    currentAssets != null && currentLiabilities != null && currentLiabilities !== 0
      ? (currentAssets / currentLiabilities) * 100
      : null;

  return {
    revenue,
    operatingIncome,
    netIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    debtRatio,
    operatingMargin,
    roe,
    currentRatio,
  };
}

export async function fetchExternalDartLabContext(stockCode: string): Promise<string | null> {
  const { dartlabServiceUrl } = getServerConfig();
  if (!dartlabServiceUrl) return null;

  try {
    const res = await fetch(`${dartlabServiceUrl.replace(/\/$/, "")}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_code: stockCode }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { markdown?: string };
    return json.markdown?.trim() ?? null;
  } catch {
    return null;
  }
}
