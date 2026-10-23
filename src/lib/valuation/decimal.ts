/**
 * Fixed-point decimals at 8 places. Equality uses this scale, never display rounding.
 * Rounding is half away from zero. Values are decimal strings, never NaN or Infinity.
 */
export const DECIMAL_SCALE = 8;
const F = 10n ** BigInt(DECIMAL_SCALE);
const NUMERIC = /^[+-]?(?:\d+)(?:\.(\d+))?$/;

export function isDecimalString(input: string): boolean {
  return NUMERIC.test(input.trim());
}

export function parseDecimal(input: string): bigint {
  const s = input.trim();
  const match = NUMERIC.exec(s);
  if (!match) throw new Error(`invalid_decimal:${input}`);
  const neg = s.startsWith("-");
  const body = s.replace(/^[+-]/, "");
  const [whole, frac = ""] = body.split(".");
  const head = (frac + "0".repeat(DECIMAL_SCALE)).slice(0, DECIMAL_SCALE);
  const extra = frac.slice(DECIMAL_SCALE);
  let v = BigInt(whole) * F + BigInt(head || "0");
  if (extra.length > 0 && extra[0]! >= "5") v += 1n;
  return neg ? -v : v;
}

export function formatDecimal(value: bigint): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / F;
  let frac = (abs % F).toString().padStart(DECIMAL_SCALE, "0");
  frac = frac.replace(/0+$/, "");
  const body = frac.length > 0 ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${body}` : body;
}

function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error("division_by_zero");
  if (d < 0n) return divRound(-n, -d);
  const neg = n < 0n;
  const an = neg ? -n : n;
  const q = an / d;
  const r = an % d;
  const up = r * 2n >= d;
  const out = up ? q + 1n : q;
  return neg ? -out : out;
}

export function decAdd(a: bigint, b: bigint): bigint {
  return a + b;
}
export function decSub(a: bigint, b: bigint): bigint {
  return a - b;
}
export function decMul(a: bigint, b: bigint): bigint {
  return divRound(a * b, F);
}
export function decDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new Error("division_by_zero");
  return divRound(a * F, b);
}
export function decCmp(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function fromNumberString(input: string): string {
  return formatDecimal(parseDecimal(input));
}

/** Round half away from zero to `places` decimal places for display only. */
export function roundDisplay(input: string, places: number): string {
  const v = parseDecimal(input);
  const factor = 10n ** BigInt(places);
  const scaled = divRound(v * factor, F);
  const neg = scaled < 0n;
  const abs = neg ? -scaled : scaled;
  const whole = abs / factor;
  const frac = (abs % factor).toString().padStart(places, "0");
  const body = places > 0 ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${body}` : body;
}

export function formatRatio(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return roundDisplay(value, 2);
}

export function formatPercent(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return `${roundDisplay(value, 1)}%`;
}
