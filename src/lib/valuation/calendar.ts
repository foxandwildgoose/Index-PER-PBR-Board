import { daysInMonth, parseYmd, seoulDate, weekday, ymOf, ymd } from "./months.ts";

/**
 * Trading calendars used to choose the latest completed regular session.
 * These are maintained rules, not a live exchange feed.
 *
 * NYSE / Nasdaq: standard full-day holidays and the usual 13:00 early closes.
 * Rare venue-specific closures are not encoded; confidence is `rule_based`.
 *
 * KRX: weekends plus a maintained 2026 list agreed by more than one public
 * calendar checked on 2026-10-23. June 3 (local election) and July 17
 * (Constitution Day) were omitted because the sources disagreed or only one
 * listed them. December 31 year-end closure was also omitted for the same
 * reason. Dates outside 2026 use weekends only and are marked partial.
 */

export type CalendarId = "XNYS" | "XNAS" | "XKRX";
export type CalendarConfidence = "rule_based" | "maintained_2026" | "partial_weekend_only";

const KRX_2026 = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-02",
  "2026-05-01",
  "2026-05-05",
  "2026-05-25",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
]);

export const CALENDAR_NOTE =
  "거래 달력은 거래소 실시간 피드가 아닙니다. 미국은 표준 휴장 규칙, 한국 2026년은 복수 출처가 겹친 휴장일만 반영합니다. 그 밖은 주말 기준이라 신뢰가 부분적입니다.";

function nthWeekday(year: number, month: number, weekdayNum: number, n: number): string {
  let seen = 0;
  for (let d = 1; d <= daysInMonth(year, month); d += 1) {
    const date = ymd(year, month, d);
    if (weekday(date) === weekdayNum) {
      seen += 1;
      if (seen === n) return date;
    }
  }
  throw new Error("nth_weekday");
}

function lastWeekday(year: number, month: number, weekdayNum: number): string {
  for (let d = daysInMonth(year, month); d >= 1; d -= 1) {
    const date = ymd(year, month, d);
    if (weekday(date) === weekdayNum) return date;
  }
  throw new Error("last_weekday");
}

function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

function addDays(date: string, delta: number): string {
  const { y, m, d } = parseYmd(date);
  const utc = new Date(Date.UTC(y, m - 1, d + delta));
  return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

function observe(date: string): string {
  const day = weekday(date);
  if (day === 6) return addDays(date, -1);
  if (day === 0) return addDays(date, 1);
  return date;
}

function usHolidays(year: number): Set<string> {
  const set = new Set<string>();
  const add = (date: string) => set.add(observe(date));
  add(`${year}-01-01`);
  set.add(nthWeekday(year, 1, 1, 3));
  set.add(nthWeekday(year, 2, 1, 3));
  set.add(addDays(easterSunday(year), -2));
  set.add(lastWeekday(year, 5, 1));
  if (year >= 2022) add(`${year}-06-19`);
  add(`${year}-07-04`);
  set.add(nthWeekday(year, 9, 1, 1));
  set.add(nthWeekday(year, 11, 4, 4));
  add(`${year}-12-25`);
  const newYear = `${year + 1}-01-01`;
  if (weekday(newYear) === 6) set.add(`${year}-12-31`);
  return set;
}

const usCache = new Map<number, Set<string>>();
function usHolidaySet(year: number): Set<string> {
  let set = usCache.get(year);
  if (!set) {
    set = usHolidays(year);
    usCache.set(year, set);
  }
  return set;
}

export function isUsEarlyClose(date: string): boolean {
  const { y, m, d } = parseYmd(date);
  if (weekday(date) === 0 || weekday(date) === 6) return false;
  if (usHolidaySet(y).has(date)) return false;
  const thanksgiving = nthWeekday(y, 11, 4, 4);
  if (date === addDays(thanksgiving, 1)) return true;
  if (m === 12 && d === 24) return true;
  if (m === 7 && d === 3 && weekday(`${y}-07-04`) !== 0 && weekday(`${y}-07-04`) !== 6) return true;
  return false;
}

export function isTradingDay(calendar: CalendarId, date: string): boolean {
  const day = weekday(date);
  if (day === 0 || day === 6) return false;
  const { y } = parseYmd(date);
  if (calendar === "XKRX") {
    if (y === 2026) return !KRX_2026.has(date);
    return true;
  }
  return !usHolidaySet(y).has(date);
}

export function calendarConfidence(calendar: CalendarId, date: string): CalendarConfidence {
  if (calendar === "XKRX") {
    return parseYmd(date).y === 2026 ? "maintained_2026" : "partial_weekend_only";
  }
  return "rule_based";
}

export function lastTradingSession(calendar: CalendarId, year: number, month: number): string | null {
  for (let d = daysInMonth(year, month); d >= 1; d -= 1) {
    const date = ymd(year, month, d);
    if (isTradingDay(calendar, date)) return date;
  }
  return null;
}

/** DST: second Sunday in March through the day before the first Sunday in November. */
export function isUsEasternDaylight(date: string): boolean {
  const { y } = parseYmd(date);
  const start = nthWeekday(y, 3, 0, 2);
  const end = nthWeekday(y, 11, 0, 1);
  return date >= start && date < end;
}

export function sessionClose(calendar: CalendarId, date: string): string {
  if (calendar === "XKRX") {
    const { y, m, d } = parseYmd(date);
    return new Date(Date.UTC(y, m - 1, d, 15 - 9, 30, 0)).toISOString();
  }
  const { y, m, d } = parseYmd(date);
  const early = isUsEarlyClose(date);
  const hourLocal = early ? 13 : 16;
  const offset = isUsEasternDaylight(date) ? 4 : 5;
  return new Date(Date.UTC(y, m - 1, d, hourLocal + offset, 0, 0)).toISOString();
}

export function latestCompletedSession(calendar: CalendarId, cutoffIso: string): string | null {
  const cutoff = new Date(cutoffIso).getTime();
  if (Number.isNaN(cutoff)) return null;
  const cursor = addDays(seoulDate(cutoffIso), 1);
  for (let i = 0; i < 16; i += 1) {
    const date = addDays(cursor, -i);
    if (!isTradingDay(calendar, date)) continue;
    if (new Date(sessionClose(calendar, date)).getTime() <= cutoff) return date;
  }
  return null;
}

export function indexCalendar(indexId: string): CalendarId {
  if (indexId === "KOSPI" || indexId === "KOSDAQ") return "XKRX";
  if (indexId === "NASDAQ_COMPOSITE" || indexId === "NASDAQ100") return "XNAS";
  return "XNYS";
}

export function monthEndSession(calendar: CalendarId, ym: string): string | null {
  const [y, m] = ym.split("-").map(Number);
  return lastTradingSession(calendar, y!, m!);
}

export function sameMonth(a: string, b: string): boolean {
  return ymOf(a) === ymOf(b);
}
