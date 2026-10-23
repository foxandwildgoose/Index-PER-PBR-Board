export function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) throw new Error(`invalid_date:${ymd}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ymOf(ymdStr: string): string {
  return ymdStr.slice(0, 7);
}

export function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) throw new Error(`invalid_month:${ym}`);
  return y * 12 + (m - 1);
}

export function fromMonthIndex(index: number): string {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function addMonths(ym: string, delta: number): string {
  return fromMonthIndex(monthIndex(ym) + delta);
}

export function monthBefore(ym: string): string {
  return addMonths(ym, -1);
}

export function monthsInclusive(start: string, end: string): string[] {
  const a = monthIndex(start);
  const b = monthIndex(end);
  if (b < a) return [];
  const out: string[] = [];
  for (let i = a; i <= b; i += 1) out.push(fromMonthIndex(i));
  return out;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function weekday(ymdStr: string): number {
  const { y, m, d } = parseYmd(ymdStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function seoulDate(iso: string): string {
  const dt = new Date(iso);
  const shifted = new Date(dt.getTime() + 9 * 60 * 60 * 1000);
  return ymd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** A calendar month is complete only once the cutoff reaches the next month. */
export function lastCompletedMonth(cutoffIso: string): string {
  const date = seoulDate(cutoffIso);
  return monthBefore(ymOf(date));
}
