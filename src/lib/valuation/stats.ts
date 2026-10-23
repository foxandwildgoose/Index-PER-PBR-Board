import { decAdd, decCmp, decDiv, formatDecimal, parseDecimal } from "./decimal.ts";

export type PositionLabel =
  | "역사적 낮은 구간"
  | "낮은 구간"
  | "중간 구간"
  | "높은 구간"
  | "역사적 상위 구간";

/** Midrank percentile. Empty sample returns null. */
export function midrankPercentile(sample: readonly string[], x: string): string | null {
  const n = sample.length;
  if (n === 0) return null;
  const target = parseDecimal(x);
  let less = 0;
  let equal = 0;
  for (const value of sample) {
    const cmp = decCmp(parseDecimal(value), target);
    if (cmp < 0) less += 1;
    else if (cmp === 0) equal += 1;
  }
  const num = 100n * (BigInt(less) * 2n + BigInt(equal));
  const den = 2n * BigInt(n);
  const scaled = (num * 10n ** 8n) / den;
  const rem = (num * 10n ** 8n) % den;
  const rounded = rem * 2n >= den ? scaled + 1n : scaled;
  return formatDecimal(rounded);
}

/**
 * Hyndman–Fan type 7. h = (N - 1) * p, linear interpolation.
 * p outside [0, 1] is clamped. Empty sample returns null.
 */
export function quantileType7(sample: readonly string[], p: number): string | null {
  if (sample.length === 0) return null;
  const pc = Math.min(1, Math.max(0, p));
  const sorted = [...sample].sort((a, b) => decCmp(parseDecimal(a), parseDecimal(b)));
  if (sorted.length === 1) return formatDecimal(parseDecimal(sorted[0]!));
  const h = (sorted.length - 1) * pc;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return formatDecimal(parseDecimal(sorted[lo]!));
  const weight = h - lo;
  const a = parseDecimal(sorted[lo]!);
  const b = parseDecimal(sorted[hi]!);
  const w = parseDecimal(weight.toFixed(8));
  const one = parseDecimal("1");
  const mixed = decAdd(decMulSafe(a, decSubSafe(one, w)), decMulSafe(b, w));
  return formatDecimal(mixed);
}

function decSubSafe(a: bigint, b: bigint): bigint {
  return a - b;
}
function decMulSafe(a: bigint, b: bigint): bigint {
  const f = 10n ** 8n;
  const n = a * b;
  const neg = n < 0n;
  const an = neg ? -n : n;
  const q = an / f;
  const r = an % f;
  const out = r * 2n >= f ? q + 1n : q;
  return neg ? -out : out;
}

export interface Extreme {
  value: string;
  dates: string[];
}

export interface DescriptiveStats {
  n: number;
  min: Extreme | null;
  max: Extreme | null;
  mean: string | null;
  median: string | null;
  p10: string | null;
  p25: string | null;
  p75: string | null;
  p90: string | null;
}

export function descriptiveStats(rows: readonly { value: string; date: string }[]): DescriptiveStats {
  if (rows.length === 0) {
    return { n: 0, min: null, max: null, mean: null, median: null, p10: null, p25: null, p75: null, p90: null };
  }
  const values = rows.map((r) => r.value);
  let minV = parseDecimal(rows[0]!.value);
  let maxV = minV;
  for (const row of rows) {
    const v = parseDecimal(row.value);
    if (decCmp(v, minV) < 0) minV = v;
    if (decCmp(v, maxV) > 0) maxV = v;
  }
  const min = formatDecimal(minV);
  const max = formatDecimal(maxV);
  let sum = 0n;
  for (const value of values) sum = decAdd(sum, parseDecimal(value));
  const mean = formatDecimal(decDiv(sum, parseDecimal(String(rows.length))));
  return {
    n: rows.length,
    min: { value: min, dates: rows.filter((r) => decCmp(parseDecimal(r.value), minV) === 0).map((r) => r.date) },
    max: { value: max, dates: rows.filter((r) => decCmp(parseDecimal(r.value), maxV) === 0).map((r) => r.date) },
    mean,
    median: quantileType7(values, 0.5),
    p10: quantileType7(values, 0.1),
    p25: quantileType7(values, 0.25),
    p75: quantileType7(values, 0.75),
    p90: quantileType7(values, 0.9),
  };
}

export function positionLabel(percentile: string): PositionLabel {
  const p = parseDecimal(percentile);
  if (decCmp(p, parseDecimal("10")) < 0) return "역사적 낮은 구간";
  if (decCmp(p, parseDecimal("30")) < 0) return "낮은 구간";
  if (decCmp(p, parseDecimal("70")) < 0) return "중간 구간";
  if (decCmp(p, parseDecimal("90")) < 0) return "높은 구간";
  return "역사적 상위 구간";
}
