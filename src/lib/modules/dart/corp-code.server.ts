import { inflateRawSync } from "node:zlib";

/** Major KR listed companies — fallback when corpCode.xml unavailable. */
const SEED_CORP_ENTRIES: Array<{ stockCode: string; corpCode: string; corpName: string }> = [
  { stockCode: "005930", corpCode: "00126380", corpName: "삼성전자" },
  { stockCode: "000660", corpCode: "00164779", corpName: "SK하이닉스" },
  { stockCode: "005380", corpCode: "00164742", corpName: "현대차" },
  { stockCode: "035420", corpCode: "00266961", corpName: "NAVER" },
  { stockCode: "035720", corpCode: "00258801", corpName: "카카오" },
  { stockCode: "051910", corpCode: "00356361", corpName: "LG화학" },
  { stockCode: "006400", corpCode: "00126362", corpName: "삼성SDI" },
  { stockCode: "005490", corpCode: "00155319", corpName: "POSCO홀딩스" },
  { stockCode: "068270", corpCode: "00413046", corpName: "셀트리온" },
  { stockCode: "105560", corpCode: "00688996", corpName: "KB금융" },
  { stockCode: "055550", corpCode: "00382199", corpName: "신한지주" },
  { stockCode: "032830", corpCode: "00105873", corpName: "삼성생명" },
  { stockCode: "066570", corpCode: "00401731", corpName: "LG전자" },
  { stockCode: "003550", corpCode: "00120030", corpName: "LG" },
  { stockCode: "034730", corpCode: "00181712", corpName: "SK" },
  { stockCode: "015760", corpCode: "00159193", corpName: "한국전력" },
  { stockCode: "012330", corpCode: "00164788", corpName: "현대모비스" },
  { stockCode: "028260", corpCode: "00149655", corpName: "삼성물산" },
  { stockCode: "207940", corpCode: "00877059", corpName: "삼성바이오로직스" },
  { stockCode: "039740", corpCode: "00261957", corpName: "한국정보공학" },
];

const SEED_STOCK_TO_CORP: Record<string, string> = Object.fromEntries(
  SEED_CORP_ENTRIES.map((e) => [e.stockCode, e.corpCode]),
);

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

    for (const entry of SEED_CORP_ENTRIES) {
      map.set(entry.stockCode, { corpCode: entry.corpCode, corpName: entry.corpName });
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
  if (!q) return [];

  const map = await loadCorpMap(apiKey);
  const matches: Array<{ stockCode: string; corpName: string; corpCode: string; score: number }> = [];
  const digitQ = query.replace(/\D/g, "");

  for (const [stockCode, entry] of map.entries()) {
    if (!entry.corpName) continue;
    const n = normalizeCorpName(entry.corpName);
    if (!n) continue;
    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q) || q.startsWith(n)) score = 80;
    else if (n.includes(q) || q.includes(n)) score = 60;
    if (digitQ.length >= 2 && stockCode.startsWith(digitQ)) {
      score = Math.max(score, 70);
    }
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
