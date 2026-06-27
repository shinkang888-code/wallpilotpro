/**
 * Technical indicators — RSI, MACD, Bollinger (WallPilot technical analyst).
 * Pure TypeScript; computed from Yahoo OHLCV closes.
 */

export type TechnicalSnapshot = {
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  bollingerPctB: number | null;
  label: string;
};

export type OhlcvSeries = {
  closes: number[];
  highs?: number[];
  lows?: number[];
  price: number;
};

export function computeTechnicalIndicators(series: OhlcvSeries): TechnicalSnapshot {
  const closes = series.closes.filter((c) => c > 0);
  const price = series.price > 0 ? series.price : (closes.at(-1) ?? 0);

  const rsi14 = computeRsi(closes, 14);
  const macd = computeMacd(closes);
  const bb = computeBollinger(closes, 20, 2);

  let bollingerPctB: number | null = null;
  if (bb.upper != null && bb.lower != null && bb.upper !== bb.lower) {
    bollingerPctB = (price - bb.lower) / (bb.upper - bb.lower);
  }

  const label = buildTechnicalLabel(rsi14, macd.histogram, bollingerPctB);

  return {
    rsi14,
    macdLine: macd.macd,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    bollingerUpper: bb.upper,
    bollingerMiddle: bb.middle,
    bollingerLower: bb.lower,
    bollingerPctB,
    label,
  };
}

/** Screener boost — WallPilot technical momentum patterns. */
export function technicalScore(tech: TechnicalSnapshot | null | undefined): number {
  if (!tech) return 0;
  let score = 0;
  if (tech.rsi14 != null) {
    if (tech.rsi14 >= 55 && tech.rsi14 <= 68) score += 8;
    else if (tech.rsi14 >= 40 && tech.rsi14 < 55) score += 4;
    else if (tech.rsi14 > 75) score -= 4;
  }
  if (tech.macdHistogram != null) {
    if (tech.macdHistogram > 0) score += 10;
    else if (tech.macdHistogram < 0) score -= 5;
  }
  if (tech.bollingerPctB != null) {
    if (tech.bollingerPctB > 0.8) score += 5;
    else if (tech.bollingerPctB < 0.2) score += 3;
  }
  return score;
}

function buildTechnicalLabel(
  rsi: number | null,
  macdHist: number | null,
  pctB: number | null,
): string {
  const parts: string[] = [];
  if (rsi != null) {
    if (rsi >= 70) parts.push(`RSI ${rsi.toFixed(0)} overbought`);
    else if (rsi <= 30) parts.push(`RSI ${rsi.toFixed(0)} oversold`);
    else parts.push(`RSI ${rsi.toFixed(0)}`);
  }
  if (macdHist != null) {
    parts.push(macdHist > 0 ? "MACD bullish" : "MACD bearish");
  }
  if (pctB != null) {
    parts.push(`BB %B ${(pctB * 100).toFixed(0)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "No technical data";
}

function computeRsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round2(100 - 100 / (1 + rs));
}

function computeMacd(closes: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
} {
  if (closes.length < 35) return { macd: null, signal: null, histogram: null };
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) macdLine.push(ema12[i]! - ema26[i]!);
  }
  if (macdLine.length < 9) return { macd: null, signal: null, histogram: null };
  const signalSeries = emaFromSeries(macdLine, 9);
  const macd = macdLine.at(-1) ?? null;
  const signal = signalSeries.at(-1) ?? null;
  const histogram = macd != null && signal != null ? macd - signal : null;
  return { macd: macd != null ? round4(macd) : null, signal: signal != null ? round4(signal) : null, histogram: histogram != null ? round4(histogram) : null };
}

function computeBollinger(
  closes: number[],
  period: number,
  stdMult: number,
): { upper: number | null; middle: number | null; lower: number | null } {
  if (closes.length < period) return { upper: null, middle: null, lower: null };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, c) => s + (c - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return {
    middle: round2(middle),
    upper: round2(middle + stdMult * std),
    lower: round2(middle - stdMult * std),
  };
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (ema == null) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      ema = seed;
      out.push(ema);
      continue;
    }
    ema = values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function emaFromSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
