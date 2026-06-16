import type { Market, ScanToggles } from "@/lib/types/stock";

export type UniverseEntry = {
  ticker: string;
  market: Market;
  name: string;
  yahooSymbol?: string;
};

/** Curated universes — replace with live Toss ranking / SEC 13F feeds when available. */
const TOSS_HIGH_ROLLERS: UniverseEntry[] = [
  { ticker: "005930", market: "KR", name: "삼성전자" },
  { ticker: "000660", market: "KR", name: "SK하이닉스" },
  { ticker: "035420", market: "KR", name: "NAVER" },
  { ticker: "035720", market: "KR", name: "카카오" },
  { ticker: "005380", market: "KR", name: "현대차" },
  { ticker: "000270", market: "KR", name: "기아" },
  { ticker: "042660", market: "KR", name: "한화오션" },
  { ticker: "196170", market: "KR", name: "알테오젠" },
  { ticker: "006400", market: "KR", name: "삼성SDI" },
  { ticker: "373220", market: "KR", name: "LG에너지솔루션" },
  { ticker: "NVDA", market: "US", name: "NVIDIA" },
  { ticker: "TSLA", market: "US", name: "Tesla" },
  { ticker: "IONQ", market: "US", name: "IonQ" },
  { ticker: "ONDS", market: "US", name: "Ondas Holdings" },
  { ticker: "HOOD", market: "US", name: "Robinhood" },
  { ticker: "AMD", market: "US", name: "AMD" },
  { ticker: "PLTR", market: "US", name: "Palantir" },
  { ticker: "COIN", market: "US", name: "Coinbase" },
  { ticker: "SMCI", market: "US", name: "Super Micro" },
];

const THIRTEEN_F_WHALES: UniverseEntry[] = [
  { ticker: "AAPL", market: "US", name: "Apple" },
  { ticker: "MSFT", market: "US", name: "Microsoft" },
  { ticker: "NVDA", market: "US", name: "NVIDIA" },
  { ticker: "GOOGL", market: "US", name: "Alphabet" },
  { ticker: "AMZN", market: "US", name: "Amazon" },
  { ticker: "META", market: "US", name: "Meta" },
  { ticker: "AVGO", market: "US", name: "Broadcom" },
  { ticker: "LLY", market: "US", name: "Eli Lilly" },
  { ticker: "V", market: "US", name: "Visa" },
  { ticker: "UNH", market: "US", name: "UnitedHealth" },
  { ticker: "BRK-B", market: "US", name: "Berkshire Hathaway" },
  { ticker: "JPM", market: "US", name: "JPMorgan" },
  { ticker: "COST", market: "US", name: "Costco" },
  { ticker: "005380", market: "KR", name: "현대차" },
  { ticker: "005930", market: "KR", name: "삼성전자" },
  { ticker: "051910", market: "KR", name: "LG화학" },
  { ticker: "028260", market: "KR", name: "삼성물산" },
];

const QUANT_SCREEN: UniverseEntry[] = [
  { ticker: "WDC", market: "US", name: "Western Digital" },
  { ticker: "STX", market: "US", name: "Seagate" },
  { ticker: "MRVL", market: "US", name: "Marvell" },
  { ticker: "KTOS", market: "US", name: "Kratos Defense" },
  { ticker: "DRS", market: "US", name: "Leonardo DRS" },
  { ticker: "GME", market: "US", name: "GameStop" },
  { ticker: "RGTI", market: "US", name: "Rigetti Computing" },
  { ticker: "010170", market: "KR", name: "대한광통신" },
  { ticker: "011790", market: "KR", name: "SKC" },
  { ticker: "QBTS", market: "US", name: "D-Wave Quantum" },
];

export function buildUniverse(toggles: ScanToggles): UniverseEntry[] {
  const map = new Map<string, UniverseEntry>();
  const add = (entries: UniverseEntry[]) => {
    for (const e of entries) map.set(`${e.market}:${e.ticker}`, e);
  };
  if (toggles.toss) add(TOSS_HIGH_ROLLERS);
  if (toggles.thirteenF) add(THIRTEEN_F_WHALES);
  if (toggles.quant) add(QUANT_SCREEN);
  if (map.size === 0) add([...TOSS_HIGH_ROLLERS, ...THIRTEEN_F_WHALES]);
  return [...map.values()];
}
