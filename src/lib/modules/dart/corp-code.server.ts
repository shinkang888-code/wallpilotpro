import { inflateRawSync } from "node:zlib";

/** Major KR listed companies — fallback when corpCode.xml unavailable. */
const SEED_STOCK_TO_CORP: Record<string, string> = {
  "005930": "00126380",
  "000660": "00164779",
  "005380": "00164742",
  "035420": "00266961",
  "035720": "00258801",
  "051910": "00356361",
  "006400": "00126362",
  "005490": "00155319",
  "068270": "00413046",
  "105560": "00688996",
  "055550": "00382199",
  "032830": "00105873",
  "066570": "00401731",
  "003550": "00120030",
  "034730": "00181712",
  "015760": "00159193",
  "009150": "00126380",
  "012330": "00164788",
  "028260": "00149655",
  "207940": "00877059",
};

let corpMapCache: Map<string, { corpCode: string; corpName: string }> | null = null;
let corpMapLoading: Promise<Map<string, { corpCode: string; corpName: string }>> | null = null;

function normalizeStockCode(code: string): string {
  return code.replace(/\D/g, "").padStart(6, "0").slice(-6);
}

/** Minimal ZIP extractor for OpenDART corpCode.xml (single-file DEFLATE archive). */
function extractCorpCodeXml(zipBuffer: Buffer): string {
  if (zipBuffer.length < 30) throw new Error("invalid_zip");

  const compressionMethod = zipBuffer.readUInt16LE(8);
  const compressedSize = zipBuffer.readUInt32LE(18);
  const fileNameLength = zipBuffer.readUInt16LE(26);
  const extraFieldLength = zipBuffer.readUInt16LE(28);
  const dataStart = 30 + fileNameLength + extraFieldLength;
  const compressed = zipBuffer.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressed.toString("utf8");
  }
  if (compressionMethod === 8) {
    return inflateRawSync(compressed).toString("utf8");
  }
  throw new Error("unsupported_zip_method");
}

async function loadCorpMap(apiKey: string): Promise<Map<string, { corpCode: string; corpName: string }>> {
  if (corpMapCache) return corpMapCache;
  if (corpMapLoading) return corpMapLoading;

  corpMapLoading = (async () => {
    const map = new Map<string, { corpCode: string; corpName: string }>();

    for (const [stock, corp] of Object.entries(SEED_STOCK_TO_CORP)) {
      map.set(stock, { corpCode: corp, corpName: "" });
    }

    try {
      const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`, {
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) return map;
      const buf = Buffer.from(await res.arrayBuffer());
      const xml = extractCorpCodeXml(buf);
      const entryRe =
        /<list>\s*<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>\s*<stock_code>([^<]*)<\/stock_code>/g;
      let match: RegExpExecArray | null;
      while ((match = entryRe.exec(xml)) !== null) {
        const stock = normalizeStockCode(match[3]);
        if (!stock || stock === "000000") continue;
        map.set(stock, { corpCode: match[1], corpName: match[2].trim() });
      }
    } catch {
      /* seed fallback */
    }

    corpMapCache = map;
    return map;
  })();

  return corpMapLoading;
}

export function normalizeCorpName(name: string): string {
  return name
    .replace(/\(주\)|（주）|㈜|주식회사|\(유\)|\(유한\)|\s+/g, "")
    .trim()
    .toLowerCase();
}

export async function searchKrStocksByCorpName(
  query: string,
  apiKey: string,
  limit = 12,
): Promise<Array<{ stockCode: string; corpName: string; corpCode: string }>> {
  const q = normalizeCorpName(query);
  if (!q || !apiKey) return [];

  const map = await loadCorpMap(apiKey);
  const matches: Array<{ stockCode: string; corpName: string; corpCode: string; score: number }> = [];

  for (const [stockCode, entry] of map.entries()) {
    if (!entry.corpName) continue;
    const n = normalizeCorpName(entry.corpName);
    if (!n) continue;
    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q) || q.startsWith(n)) score = 80;
    else if (n.includes(q) || q.includes(n)) score = 60;
    if (score > 0) {
      matches.push({ stockCode, corpName: entry.corpName, corpCode: entry.corpCode, score });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.corpName.length - b.corpName.length);
  return matches.slice(0, limit).map(({ stockCode, corpName, corpCode }) => ({
    stockCode,
    corpName,
    corpCode,
  }));
}

export async function lookupKrStockByCorpName(
  query: string,
  apiKey: string,
): Promise<{ stockCode: string; corpName: string; corpCode: string } | null> {
  const hits = await searchKrStocksByCorpName(query, apiKey, 1);
  return hits[0] ?? null;
}

export async function resolveCorpCode(
  stockCodeInput: string,
  apiKey: string,
): Promise<{ corpCode: string; corpName: string; stockCode: string } | null> {
  const stockCode = normalizeStockCode(stockCodeInput);
  if (!/^\d{6}$/.test(stockCode)) return null;

  const seeded = SEED_STOCK_TO_CORP[stockCode];
  if (seeded && !apiKey) {
    return { corpCode: seeded, corpName: "", stockCode };
  }

  const map = apiKey ? await loadCorpMap(apiKey) : new Map();
  const hit = map.get(stockCode) ?? (seeded ? { corpCode: seeded, corpName: "" } : null);
  if (!hit) return null;
  return { corpCode: hit.corpCode, corpName: hit.corpName, stockCode };
}

export function resetCorpCodeCacheForTests(): void {
  corpMapCache = null;
  corpMapLoading = null;
}
