import { CRISIS_WINDOWS, HISTORY_START } from "./registry.ts";
import { lastCompletedMonth, monthBefore, monthIndex, monthsInclusive, ymOf } from "./months.ts";
import { indexCalendar, monthEndSession } from "./calendar.ts";
import { decAdd, decDiv, formatDecimal, parseDecimal } from "./decimal.ts";

export interface ReferenceWindow {
  historyStart: string;
  lastCompletedMonth: string;
  requestedEnd: string;
  requestedMonthCount: number;
  currentPeriod: string;
  referenceEnd: string;
  referenceMonthCount: number;
}

export function referenceWindow(input: {
  currentObservationDate: string;
  cutoffIso: string;
  historyStart?: string;
}): ReferenceWindow {
  const historyStart = input.historyStart ?? HISTORY_START;
  const completed = lastCompletedMonth(input.cutoffIso);
  const currentPeriod = ymOf(input.currentObservationDate);
  const referenceEnd = monthIndex(monthBefore(currentPeriod)) < monthIndex(completed)
    ? monthBefore(currentPeriod)
    : completed;
  const requested = monthsInclusive(historyStart, completed);
  const reference = monthsInclusive(historyStart, referenceEnd);
  return {
    historyStart,
    lastCompletedMonth: completed,
    requestedEnd: completed,
    requestedMonthCount: requested.length,
    currentPeriod,
    referenceEnd,
    referenceMonthCount: reference.length,
  };
}

export type MonthState = "numeric" | "not_meaningful" | "missing_explicit" | "missing_inferred" | "conflict";

export interface MonthCell {
  month: string;
  state: MonthState;
  value: string | null;
  observationDate: string | null;
  explicitSourceRow: boolean;
  inCrisis: boolean;
}

export function inCrisis(month: string): boolean {
  return CRISIS_WINDOWS.some((w) => month >= w.start && month <= w.end);
}

export interface RawPoint {
  observationDate: string;
  value: string | null;
  status: "valid" | "missing" | "not_meaningful" | "source_conflict" | "quarantined";
  frequency: "daily_close" | "monthly_close" | "monthly_average" | "quarterly" | "annual";
  explicitSourceRow: boolean;
  indexId: string;
}

/**
 * Build a monthly grid. Daily points become a month only when the source has
 * the calendar's final session. Quarterly points are not copied into three months.
 */
export function monthlyGrid(input: {
  points: RawPoint[];
  start: string;
  end: string;
  indexId: string;
}): { cells: MonthCell[]; frequencyNote: string | null } {
  const months = monthsInclusive(input.start, input.end);
  const quarterly = input.points.some((p) => p.frequency === "quarterly");
  if (quarterly) {
    return {
      cells: months.map((month) => ({
        month,
        state: "missing_inferred" as const,
        value: null,
        observationDate: null,
        explicitSourceRow: false,
        inCrisis: inCrisis(month),
      })),
      frequencyNote: "분기 관측을 월 3개로 복제하지 않습니다.",
    };
  }
  const byMonth = new Map<string, RawPoint[]>();
  for (const point of input.points) {
    const month = ymOf(point.observationDate);
    const list = byMonth.get(month) ?? [];
    list.push(point);
    byMonth.set(month, list);
  }
  const calendar = indexCalendar(input.indexId);
  const cells: MonthCell[] = months.map((month) => {
    const group = byMonth.get(month) ?? [];
    const base = { month, inCrisis: inCrisis(month) };
    if (group.length === 0) {
      return { ...base, state: "missing_inferred", value: null, observationDate: null, explicitSourceRow: false };
    }
    const daily = group.some((p) => p.frequency === "daily_close");
    if (daily) {
      const expected = monthEndSession(calendar, month);
      const hit = expected ? group.find((p) => p.observationDate === expected) : undefined;
      if (!hit) {
        return { ...base, state: "missing_inferred", value: null, observationDate: expected, explicitSourceRow: false };
      }
      return cellFromPoint(base, hit);
    }
    const chosen = [...group].sort((a, b) => (a.observationDate < b.observationDate ? 1 : -1))[0]!;
    return cellFromPoint(base, chosen);
  });
  return { cells, frequencyNote: null };
}

function cellFromPoint(base: { month: string; inCrisis: boolean }, point: RawPoint): MonthCell {
  if (point.status === "source_conflict" || point.status === "quarantined") {
    return { ...base, state: "conflict", value: null, observationDate: point.observationDate, explicitSourceRow: true };
  }
  if (point.status === "not_meaningful") {
    return { ...base, state: "not_meaningful", value: null, observationDate: point.observationDate, explicitSourceRow: true };
  }
  if (point.status === "missing" || point.value == null) {
    return {
      ...base,
      state: point.explicitSourceRow ? "missing_explicit" : "missing_inferred",
      value: null,
      observationDate: point.observationDate,
      explicitSourceRow: point.explicitSourceRow,
    };
  }
  return {
    ...base,
    state: "numeric",
    value: point.value,
    observationDate: point.observationDate,
    explicitSourceRow: true,
  };
}

export interface GateInput {
  cells: MonthCell[];
  expectedStart: string;
  methodologyBreak: boolean;
  definitionsKnown: boolean;
  freshnessOk: boolean;
  unresolvedConflict: boolean;
  distributionMismatch: boolean;
}

export interface GateResult {
  qualified: boolean;
  reasons: string[];
  expected: number;
  observed: number;
  numeric: number;
  notMeaningful: number;
  inferredMissing: number;
  observedCoverage: string;
  numericCoverage: string;
  longestMissingRun: number;
  crisisMissingShare: string | null;
  partialStart: string | null;
}

export function coverageGate(input: GateInput): GateResult {
  const expected = input.cells.length;
  let observed = 0;
  let numeric = 0;
  let notMeaningful = 0;
  let inferredMissing = 0;
  let missingRun = 0;
  let longest = 0;
  let crisisMissing = 0;
  let anyMissing = 0;
  for (const cell of input.cells) {
    if (cell.state === "numeric") {
      observed += 1;
      numeric += 1;
      missingRun = 0;
    } else if (cell.state === "not_meaningful") {
      observed += 1;
      notMeaningful += 1;
      missingRun = 0;
    } else if (cell.state === "missing_explicit" || cell.state === "conflict") {
      observed += 1;
      missingRun = 0;
    } else {
      inferredMissing += 1;
      anyMissing += 1;
      missingRun += 1;
      longest = Math.max(longest, missingRun);
      if (cell.inCrisis) crisisMissing += 1;
    }
  }
  const reasons: string[] = [];
  const observedCoverage = expected === 0 ? "0" : formatRatioNumber(observed / expected);
  const numericCoverage = expected === 0 ? "0" : formatRatioNumber(numeric / expected);
  if (numeric < 48) reasons.push("numeric_below_48");
  if (expected === 0 || numeric / expected < 0.8) reasons.push("numeric_coverage_below_80");
  if (expected === 0 || observed / expected < 0.95) reasons.push("observed_coverage_below_95");
  const first = input.cells[0];
  const startCovered = first != null && first.month === input.expectedStart && first.state !== "missing_inferred";
  if (!startCovered) reasons.push("requested_start_not_covered");
  if (input.methodologyBreak) reasons.push("methodology_break");
  if (!input.definitionsKnown) reasons.push("definition_unknown");
  if (!input.freshnessOk) reasons.push("freshness");
  if (input.unresolvedConflict) reasons.push("unresolved_conflict");
  if (input.distributionMismatch) reasons.push("distribution_mismatch");
  let partialStart: string | null = null;
  const firstNumeric = input.cells.find((c) => c.state === "numeric" || c.state === "not_meaningful");
  if (!startCovered && firstNumeric) partialStart = firstNumeric.month;
  return {
    qualified: reasons.length === 0,
    reasons,
    expected,
    observed,
    numeric,
    notMeaningful,
    inferredMissing,
    observedCoverage,
    numericCoverage,
    longestMissingRun: longest,
    crisisMissingShare: anyMissing === 0 ? null : formatRatioNumber(crisisMissing / anyMissing),
    partialStart,
  };
}

function formatRatioNumber(n: number): string {
  return (Math.round(n * 10000) / 10000).toString();
}

export interface AnnualCell {
  year: number;
  label: "completed" | "ytd";
  value: string | null;
  observationDate: string | null;
  reason: string | null;
  count: number | null;
  expectedMonths: number;
}

export function annualTable(input: {
  cells: MonthCell[];
  mode: "year_end" | "annual_mean";
  firstYear: number;
  lastYear: number;
  ytdYear: number | null;
  januaryNotes: string[];
}): AnnualCell[] {
  const rows: AnnualCell[] = [];
  for (let year = input.firstYear; year <= input.lastYear; year += 1) {
    const label = input.ytdYear === year ? "ytd" : "completed";
    const yearCells = input.cells.filter((c) => c.month.startsWith(`${year}-`));
    const expectedMonths = label === "ytd" ? yearCells.length : 12;
    if (input.mode === "year_end") {
      if (label === "ytd") {
        rows.push({
          year,
          label,
          value: null,
          observationDate: null,
          reason: "year_to_date_not_year_end",
          count: null,
          expectedMonths,
        });
        continue;
      }
      const december = yearCells.find((c) => c.month === `${year}-12`);
      if (!december || december.state !== "numeric" || !december.value) {
        const reason = december?.state === "not_meaningful" ? "not_meaningful" : "no_december_year_end";
        rows.push({
          year,
          label,
          value: null,
          observationDate: december?.observationDate ?? null,
          reason,
          count: null,
          expectedMonths,
        });
        continue;
      }
      rows.push({
        year,
        label,
        value: december.value,
        observationDate: december.observationDate,
        reason: null,
        count: 1,
        expectedMonths,
      });
      continue;
    }
    const numeric = yearCells.filter((c) => c.state === "numeric" && c.value);
    if (numeric.length === 0) {
      rows.push({
        year,
        label,
        value: null,
        observationDate: null,
        reason: "no_numeric_months",
        count: 0,
        expectedMonths,
      });
      continue;
    }
    let sum = 0n;
    for (const cell of numeric) sum = decAdd(sum, parseDecimal(cell.value!));
    rows.push({
      year,
      label,
      value: formatDecimal(decDiv(sum, parseDecimal(String(numeric.length)))),
      observationDate: null,
      reason: null,
      count: numeric.length,
      expectedMonths,
    });
  }
  return rows;
}

export function noteJanuary(points: { observationDate: string }[]): string[] {
  const notes: string[] = [];
  if (points.some((p) => p.observationDate.endsWith("-01-31") || /-01-\d{2}$/.test(p.observationDate) && p.observationDate.slice(5, 7) === "01")) {
    notes.push("1월 관측은 전년 12월 말로 옮기지 않습니다.");
  }
  return notes;
}

export function trailingBounds(referenceEnd: string, months: number): { start: string; end: string } {
  const endIndex = monthIndex(referenceEnd);
  const start = endIndex - (months - 1);
  const y = Math.floor(start / 12);
  const m = (start % 12) + 1;
  return { start: `${y}-${String(m).padStart(2, "0")}`, end: referenceEnd };
}
