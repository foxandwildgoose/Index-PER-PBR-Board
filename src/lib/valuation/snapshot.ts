import { descriptiveRevisionAllowed, discountPercent, crossCompatible, strictRevisionAllowed, type VintageMode } from "./compare.ts";
import { annualTable, coverageGate, monthlyGrid, noteJanuary, referenceWindow, trailingBounds, type MonthCell } from "./coverage.ts";
import { calendarConfidence, indexCalendar, latestCompletedSession, CALENDAR_NOTE } from "./calendar.ts";
import { CALCULATION_VERSION, HISTORY_START, INDICES, METRICS, REQUESTED_CUTOFF, metricById } from "./registry.ts";
import { descriptiveStats, midrankPercentile, positionLabel } from "./stats.ts";
import { judgeFreshness } from "./freshness.ts";
import { lastCompletedMonth, seoulDate } from "./months.ts";
import { tableToCsv, type ExportTable } from "./export-csv.ts";

export type DatasetFilter = "imported" | "fixture";
export type HistoryWindow = "since_2000" | "trailing_10y" | "trailing_5y";
export type AnnualMode = "year_end" | "annual_mean";

export interface SnapshotPoint {
  revisionId: string;
  observationDate: string;
  sessionCloseAt: string | null;
  value: string | null;
  status: "valid" | "missing" | "not_meaningful" | "source_conflict" | "quarantined";
  reasonCode: string | null;
  priceAsOf: string | null;
  financialPeriodEnd: string | null;
  availableAt: string | null;
  availabilityPrecision: "timestamp" | "date" | "unknown";
  retrievedAt: string;
  isEstimate: boolean;
  estimateOrigin: "provider" | "application" | "scenario" | "none";
  denominatorStatus: "positive" | "zero" | "negative" | "unknown";
  denominatorEvidence: "source_explicit" | "verified_reconstruction" | "unknown";
  sourceUrl: string;
  vintageMode: "point_in_time" | "current_vintage" | "unknown";
  explicitSourceRow: boolean;
}

export interface SnapshotSeries {
  seriesId: string;
  indexId: string;
  metricId: string;
  providerId: string;
  datasetKind: "live" | "imported" | "fixture";
  frequency: "daily_close" | "monthly_close" | "monthly_average" | "quarterly" | "annual";
  dateSemantics: string;
  earningsBasis: string;
  lossTreatment: string;
  aggregationMethod: string;
  indexWeighting: string;
  negativeEquityTreatment: string;
  methodologyVersion: string;
  methodologyBreak: boolean;
  interpolated: boolean;
  points: SnapshotPoint[];
}

export interface BuildInput {
  series: SnapshotSeries[];
  executionIso: string;
  mode: "fixed" | "live";
  vintage: VintageMode;
  dataset: DatasetFilter;
  annualMode: AnnualMode;
  historyWindow: HistoryWindow;
  perMetricId: string;
  pbrMetricId: string;
  sourcedButRejected?: number;
}

export interface SlotView {
  seriesId: string | null;
  metricId: string;
  metricLabel: string;
  value: string | null;
  statusText: string;
  observationDate: string | null;
  priceAsOf: string | null;
  financialPeriodEnd: string | null;
  isEstimate: boolean;
  estimateOrigin: string;
  providerId: string | null;
  freshness: string;
  percentile: string | null;
  positionLabel: string | null;
  qualified: boolean;
  partial: boolean;
  insufficient: boolean;
  reasons: string[];
  note: string;
  sampleSize: number;
  referenceEnd: string | null;
  requestedMonthCount: number | null;
  referenceMonthCount: number | null;
}

export interface Snapshot {
  snapshotId: string;
  calculationVersion: string;
  mode: "fixed" | "live";
  vintage: VintageMode;
  dataset: DatasetFilter;
  fixture: boolean;
  executionIso: string;
  requestedCutoff: string | null;
  effectiveCutoff: string;
  valuationCutoff: string;
  knowledgeCutoff: string;
  seoulDate: string;
  calendarNote: string;
  sessions: { indexId: string; session: string | null; confidence: string }[];
  perMetricId: string;
  pbrMetricId: string;
  annualMode: AnnualMode;
  historyWindow: HistoryWindow;
  cards: {
    indexId: string;
    displayName: string;
    per: SlotView;
    pbr: SlotView;
  }[];
  annual: {
    year: number;
    label: "completed" | "ytd";
    cells: Record<string, { value: string | null; reason: string | null; count: number | null; date: string | null }>;
  }[];
  annualNotes: string[];
  seriesViews: SeriesView[];
  relatives: RelativeView[];
  coverage: CoverageView[];
  sourcedButRejected: number;
  strictBlocked: boolean;
}

export interface SeriesView {
  seriesId: string;
  indexId: string;
  metricId: string;
  chart: { month: string; value: string | null }[];
  current: { month: string; value: string | null; date: string | null } | null;
  bands: { p10: string | null; median: string | null; p90: string | null };
  qualification: { qualified: boolean; reasons: string[]; observedCoverage: string; numericCoverage: string };
  stats: ReturnType<typeof descriptiveStats>;
  referenceEnd: string;
  windowStart: string;
  interpolated: boolean;
  dateSemantics: string;
}

export interface RelativeView {
  leftId: string;
  rightId: string;
  leftIndex: string;
  rightIndex: string;
  metricId: string;
  enabled: boolean;
  reason: string | null;
  discountPercent: string | null;
  direction: "할인" | "프리미엄" | null;
  leftValue: string | null;
  rightValue: string | null;
  leftDate: string | null;
  rightDate: string | null;
  commonMonths: number;
  lostMonths: number;
}

export interface CoverageView {
  seriesId: string;
  indexId: string;
  metricId: string;
  start: string | null;
  last: string | null;
  expected: number;
  observed: number;
  numeric: number;
  missing: number;
  notMeaningful: number;
  methodologyBreak: boolean;
  longestMissingRun: number;
}

function fnv(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function effectiveInstant(mode: "fixed" | "live", executionIso: string): string {
  if (mode === "live") return new Date(executionIso).toISOString();
  const requested = new Date(REQUESTED_CUTOFF).getTime();
  const exec = new Date(executionIso).getTime();
  return new Date(Math.min(requested, exec)).toISOString();
}

function emptySlot(metricId: string): SlotView {
  const metric = metricById(metricId);
  return {
    seriesId: null,
    metricId,
    metricLabel: metric?.label ?? metricId,
    value: null,
    statusText: "자료 없음",
    observationDate: null,
    priceAsOf: null,
    financialPeriodEnd: null,
    isEstimate: false,
    estimateOrigin: "none",
    providerId: null,
    freshness: "자료 없음",
    percentile: null,
    positionLabel: null,
    qualified: false,
    partial: false,
    insufficient: true,
    reasons: ["no_series"],
    note: "이 정의의 시계열이 없습니다. 다른 정의를 이 칸에 넣지 않습니다.",
    sampleSize: 0,
    referenceEnd: null,
    requestedMonthCount: null,
    referenceMonthCount: null,
  };
}

function definitionsKnown(series: SnapshotSeries): boolean {
  const fields = [
    series.earningsBasis,
    series.lossTreatment,
    series.aggregationMethod,
    series.indexWeighting,
    series.negativeEquityTreatment,
    series.dateSemantics,
  ];
  return fields.every((f) => f && f !== "unknown" && f !== "unspecified");
}

export function buildSnapshot(input: BuildInput): Snapshot {
  const valuationCutoff = effectiveInstant(input.mode, input.executionIso);
  const knowledgeCutoff = input.vintage === "STRICT_AS_KNOWN" ? valuationCutoff : new Date(input.executionIso).toISOString();
  const cutoffs = { valuationCutoff, knowledgeCutoff };
  const selected = input.series.filter((s) =>
    input.dataset === "fixture" ? s.datasetKind === "fixture" : s.datasetKind !== "fixture",
  );
  let strictBlocked = false;
  const visibleSeries = selected.map((series) => {
    const points = series.points.filter((point) => {
      const verdict =
        input.vintage === "STRICT_AS_KNOWN" ? strictRevisionAllowed(point, cutoffs) : descriptiveRevisionAllowed(point, cutoffs);
      if (input.vintage === "STRICT_AS_KNOWN" && !verdict.ok) strictBlocked = true;
      return verdict.ok;
    });
    return { ...series, points };
  });

  const sessions = INDICES.filter((i) => i.role === "primary").map((index) => {
    const session = latestCompletedSession(index.calendarId, valuationCutoff);
    return {
      indexId: index.id,
      session,
      confidence: session ? calendarConfidence(index.calendarId, session) : "partial_weekend_only",
    };
  });

  const seriesViews: SeriesView[] = [];
  const coverage: CoverageView[] = [];
  const slotByKey = new Map<string, SlotView>();
  const currentBySeries = new Map<string, SnapshotPoint | null>();

  for (const series of visibleSeries) {
    const current = pickCurrent(series.points);
    currentBySeries.set(series.seriesId, current);
    const calendar = indexCalendar(series.indexId);
    const expectedSession =
      series.frequency === "daily_close"
        ? latestCompletedSession(calendar, valuationCutoff)
        : null;
    const completedMonth = lastCompletedMonth(valuationCutoff);
    const latestDate = current?.observationDate ?? null;
    const freshState = judgeFreshness({
      latestObservedDate: latestDate,
      expectedSession: series.frequency === "daily_close" ? expectedSession : `${completedMonth}-01`,
    });
    const freshnessOk = freshState === "fresh" || freshState === "awaiting_publication";
    if (!current) {
      coverage.push(blankCoverage(series));
      continue;
    }
    const ref = referenceWindow({ currentObservationDate: current.observationDate, cutoffIso: valuationCutoff });
    const grid = monthlyGrid({
      points: series.points.map((p) => ({
        observationDate: p.observationDate,
        value: p.value,
        status: p.status,
        frequency: series.frequency,
        explicitSourceRow: p.explicitSourceRow,
        indexId: series.indexId,
      })),
      start: HISTORY_START,
      end: ref.requestedEnd,
      indexId: series.indexId,
    });
    const windowStart =
      input.historyWindow === "since_2000"
        ? HISTORY_START
        : trailingBounds(ref.referenceEnd, input.historyWindow === "trailing_10y" ? 120 : 60).start;
    const sampleCells = grid.cells.filter((c) => c.month >= windowStart && c.month <= ref.referenceEnd);
    const expectedStart = input.historyWindow === "since_2000" ? HISTORY_START : windowStart;
    const mismatch = series.dateSemantics === "monthly_average" || series.interpolated;
    const gate = coverageGate({
      cells: sampleCells,
      expectedStart,
      methodologyBreak: series.methodologyBreak,
      definitionsKnown: definitionsKnown(series),
      freshnessOk: freshnessOk && !grid.frequencyNote,
      unresolvedConflict: series.points.some((p) => p.status === "source_conflict" || p.status === "quarantined"),
      distributionMismatch: mismatch,
    });
    const numericRows = sampleCells.filter((c) => c.state === "numeric" && c.value).map((c) => ({ value: c.value!, date: c.observationDate ?? c.month }));
    const stats = descriptiveStats(numericRows);
    const percentile = current.value && current.status === "valid" ? midrankPercentile(numericRows.map((r) => r.value), current.value) : null;
    const qualified = gate.qualified && current.status === "valid" && percentile != null;
    const partial = !qualified && numericRows.length >= 2;
    const insufficient = numericRows.length < 2;
    const metric = metricById(series.metricId);
    const noteParts = [];
    if (grid.frequencyNote) noteParts.push(grid.frequencyNote);
    if (mismatch) noteParts.push("월평균 또는 보간 시계열이라 합격 라벨을 붙이지 않습니다.");
    if (series.frequency === "daily_close") noteParts.push("현물 값이 월말 종가 분포 안에 있는 위치입니다.");
    if (partial && gate.partialStart) noteParts.push(`부분 이력 ${gate.partialStart}부터. 2000년 이후로 부르지 않습니다.`);
    if (!definitionsKnown(series)) noteParts.push("산식 미확인");
    const slot: SlotView = {
      seriesId: series.seriesId,
      metricId: series.metricId,
      metricLabel: metric?.label ?? series.metricId,
      value: current.status === "valid" ? current.value : null,
      statusText:
        current.status === "valid"
          ? current.isEstimate
            ? "앱 또는 제공자 추정치"
            : "관측"
          : current.status === "not_meaningful"
            ? "의미 없음"
            : current.status === "source_conflict"
              ? "출처 충돌"
              : "자료 없음",
      observationDate: current.observationDate,
      priceAsOf: current.priceAsOf,
      financialPeriodEnd: current.financialPeriodEnd,
      isEstimate: current.isEstimate,
      estimateOrigin: current.estimateOrigin,
      providerId: series.providerId,
      freshness:
        freshState === "fresh"
          ? "기대 시점 반영"
          : freshState === "awaiting_publication"
            ? "최신 공표 대기"
            : freshState === "no_data"
              ? "자료 없음"
              : "이전 자료 유지",
      percentile: qualified ? percentile : partial ? percentile : null,
      positionLabel: qualified && percentile ? positionLabel(percentile) : null,
      qualified,
      partial,
      insufficient,
      reasons: gate.reasons,
      note: noteParts.join(" "),
      sampleSize: numericRows.length,
      referenceEnd: ref.referenceEnd,
      requestedMonthCount: ref.requestedMonthCount,
      referenceMonthCount: ref.referenceMonthCount,
    };
    slotByKey.set(`${series.indexId}:${series.metricId}`, slot);
    const chartCells = sampleCells;
    seriesViews.push({
      seriesId: series.seriesId,
      indexId: series.indexId,
      metricId: series.metricId,
      chart: chartCells.map((c) => ({ month: c.month, value: c.state === "numeric" ? c.value : null })),
      current:
        ymOfSafe(current.observationDate) > ref.referenceEnd
          ? { month: ymOfSafe(current.observationDate), value: current.value, date: current.observationDate }
          : { month: ymOfSafe(current.observationDate), value: current.value, date: current.observationDate },
      bands: { p10: stats.p10, median: stats.median, p90: stats.p90 },
      qualification: {
        qualified,
        reasons: gate.reasons,
        observedCoverage: gate.observedCoverage,
        numericCoverage: gate.numericCoverage,
      },
      stats,
      referenceEnd: ref.referenceEnd,
      windowStart,
      interpolated: series.interpolated,
      dateSemantics: series.dateSemantics,
    });
    const requestedCells = grid.cells;
    coverage.push({
      seriesId: series.seriesId,
      indexId: series.indexId,
      metricId: series.metricId,
      start: series.points.map((p) => p.observationDate).sort()[0] ?? null,
      last: latestDate,
      expected: requestedCells.length,
      observed: requestedCells.filter((c) => c.state !== "missing_inferred").length,
      numeric: requestedCells.filter((c) => c.state === "numeric").length,
      missing: requestedCells.filter((c) => c.state === "missing_inferred" || c.state === "missing_explicit").length,
      notMeaningful: requestedCells.filter((c) => c.state === "not_meaningful").length,
      methodologyBreak: series.methodologyBreak,
      longestMissingRun: gate.longestMissingRun,
    });
  }

  const cards = INDICES.filter((i) => i.role === "primary").map((index) => ({
    indexId: index.id,
    displayName: index.displayName,
    per: slotByKey.get(`${index.id}:${input.perMetricId}`) ?? emptySlot(input.perMetricId),
    pbr: slotByKey.get(`${index.id}:${input.pbrMetricId}`) ?? emptySlot(input.pbrMetricId),
  }));

  const annual = buildAnnual(visibleSeries, input.annualMode, valuationCutoff, input.perMetricId, input.pbrMetricId);
  const relatives = buildRelatives(visibleSeries, currentBySeries, input.perMetricId);
  const canonical = JSON.stringify({
    calculationVersion: CALCULATION_VERSION,
    valuationCutoff,
    knowledgeCutoff,
    vintage: input.vintage,
    dataset: input.dataset,
    annualMode: input.annualMode,
    historyWindow: input.historyWindow,
    perMetricId: input.perMetricId,
    pbrMetricId: input.pbrMetricId,
    revisions: visibleSeries.flatMap((s) => s.points.map((p) => p.revisionId)).sort(),
  });
  return {
    snapshotId: `snap_${fnv(canonical)}`,
    calculationVersion: CALCULATION_VERSION,
    mode: input.mode,
    vintage: input.vintage,
    dataset: input.dataset,
    fixture: input.dataset === "fixture",
    executionIso: new Date(input.executionIso).toISOString(),
    requestedCutoff: input.mode === "fixed" ? REQUESTED_CUTOFF : null,
    effectiveCutoff: valuationCutoff,
    valuationCutoff,
    knowledgeCutoff,
    seoulDate: seoulDate(valuationCutoff),
    calendarNote: CALENDAR_NOTE,
    sessions,
    perMetricId: input.perMetricId,
    pbrMetricId: input.pbrMetricId,
    annualMode: input.annualMode,
    historyWindow: input.historyWindow,
    cards,
    annual: annual.rows,
    annualNotes: annual.notes,
    seriesViews,
    relatives,
    coverage,
    sourcedButRejected: input.sourcedButRejected ?? 0,
    strictBlocked: input.vintage === "STRICT_AS_KNOWN" && strictBlocked,
  };
}

function ymOfSafe(date: string): string {
  return date.slice(0, 7);
}

function pickCurrent(points: SnapshotPoint[]): SnapshotPoint | null {
  const usable = points.filter((p) => p.status !== "quarantined");
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => {
    const ak = a.sessionCloseAt ?? a.observationDate;
    const bk = b.sessionCloseAt ?? b.observationDate;
    if (ak === bk) return a.revisionId < b.revisionId ? 1 : -1;
    return ak < bk ? 1 : -1;
  })[0]!;
}

function blankCoverage(series: SnapshotSeries): CoverageView {
  return {
    seriesId: series.seriesId,
    indexId: series.indexId,
    metricId: series.metricId,
    start: null,
    last: null,
    expected: 0,
    observed: 0,
    numeric: 0,
    missing: 0,
    notMeaningful: 0,
    methodologyBreak: series.methodologyBreak,
    longestMissingRun: 0,
  };
}

function buildAnnual(
  series: SnapshotSeries[],
  mode: AnnualMode,
  cutoff: string,
  perMetric: string,
  pbrMetric: string,
): { rows: Snapshot["annual"]; notes: string[] } {
  const completed = lastCompletedMonth(cutoff);
  const lastYear = Number(completed.slice(0, 4));
  const ytdYear = completed.endsWith("-12") ? null : lastYear;
  const wanted = new Set([perMetric, pbrMetric]);
  const notes = new Set<string>();
  const byKey = new Map<string, MonthCell[]>();
  for (const item of series) {
    if (!wanted.has(item.metricId)) continue;
    if (!INDICES.some((i) => i.id === item.indexId && i.role === "primary")) continue;
    const grid = monthlyGrid({
      points: item.points.map((p) => ({
        observationDate: p.observationDate,
        value: p.value,
        status: p.status,
        frequency: item.frequency,
        explicitSourceRow: p.explicitSourceRow,
        indexId: item.indexId,
      })),
      start: HISTORY_START,
      end: completed,
      indexId: item.indexId,
    });
    byKey.set(`${item.indexId}:${item.metricId}`, grid.cells);
    for (const note of noteJanuary(item.points)) notes.add(note);
  }
  const rows: Snapshot["annual"] = [];
  for (let year = 2000; year <= lastYear; year += 1) {
    const cells: Snapshot["annual"][number]["cells"] = {};
    for (const index of INDICES.filter((i) => i.role === "primary")) {
      for (const metricId of [perMetric, pbrMetric]) {
        const key = `${index.id}:${metricId}`;
        const grid = byKey.get(key);
        const table = annualTable({
          cells: grid ?? [],
          mode,
          firstYear: year,
          lastYear: year,
          ytdYear,
          januaryNotes: [],
        });
        const cell = table[0];
        cells[key] = {
          value: cell?.value ?? null,
          reason: cell?.reason ?? "자료 없음",
          count: cell?.count ?? null,
          date: cell?.observationDate ?? null,
        };
      }
    }
    rows.push({ year, label: ytdYear === year ? "ytd" : "completed", cells });
  }
  return { rows, notes: [...notes] };
}

function buildRelatives(
  series: SnapshotSeries[],
  currentBySeries: Map<string, SnapshotPoint | null>,
  metricId: string,
): RelativeView[] {
  const group = series.filter(
    (s) => s.metricId === metricId && INDICES.some((i) => i.id === s.indexId && i.role === "primary"),
  );
  const out: RelativeView[] = [];
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      const left = group[i]!;
      const right = group[j]!;
      const compat = crossCompatible(
        {
          metricId: left.metricId,
          family: metricById(left.metricId)?.family ?? "per",
          earningsBasis: left.earningsBasis,
          lossTreatment: left.lossTreatment,
          aggregationMethod: left.aggregationMethod,
          indexWeighting: left.indexWeighting,
          negativeEquityTreatment: left.negativeEquityTreatment,
          frequency: left.frequency,
          dateSemantics: left.dateSemantics,
        },
        {
          metricId: right.metricId,
          family: metricById(right.metricId)?.family ?? "per",
          earningsBasis: right.earningsBasis,
          lossTreatment: right.lossTreatment,
          aggregationMethod: right.aggregationMethod,
          indexWeighting: right.indexWeighting,
          negativeEquityTreatment: right.negativeEquityTreatment,
          frequency: right.frequency,
          dateSemantics: right.dateSemantics,
        },
      );
      const lc = currentBySeries.get(left.seriesId) ?? null;
      const rc = currentBySeries.get(right.seriesId) ?? null;
      const monthsL = new Set(left.points.filter((p) => p.status === "valid").map((p) => p.observationDate.slice(0, 7)));
      const monthsR = new Set(right.points.filter((p) => p.status === "valid").map((p) => p.observationDate.slice(0, 7)));
      let common = 0;
      for (const month of monthsL) if (monthsR.has(month)) common += 1;
      const lost = monthsL.size + monthsR.size - 2 * common;
      const discount =
        compat.ok && lc?.value && rc?.value && lc.status === "valid" && rc.status === "valid"
          ? discountPercent(lc.value, rc.value)
          : null;
      out.push({
        leftId: left.seriesId,
        rightId: right.seriesId,
        leftIndex: left.indexId,
        rightIndex: right.indexId,
        metricId,
        enabled: Boolean(discount),
        reason: compat.ok ? (discount ? null : "nonpositive_or_missing") : compat.reason,
        discountPercent: discount?.value ?? null,
        direction: discount?.direction ?? null,
        leftValue: lc?.status === "valid" ? lc.value : null,
        rightValue: rc?.status === "valid" ? rc.value : null,
        leftDate: lc?.observationDate ?? null,
        rightDate: rc?.observationDate ?? null,
        commonMonths: common,
        lostMonths: lost,
      });
    }
  }
  return out;
}

export function snapshotExports(snapshot: Snapshot): { csv: string; metadata: string } {
  const header = [
    "snapshot_id",
    "index_id",
    "metric_id",
    "year",
    "row_label",
    "value",
    "reason",
    "observation_date",
    "vintage",
    "dataset",
    "fixture",
  ];
  const rows: string[][] = [];
  for (const row of snapshot.annual) {
    for (const [key, cell] of Object.entries(row.cells)) {
      const [indexId, metricId] = key.split(":");
      rows.push([
        snapshot.snapshotId,
        indexId ?? "",
        metricId ?? "",
        String(row.year),
        row.label,
        cell.value ?? "",
        cell.reason ?? "",
        cell.date ?? "",
        snapshot.vintage,
        snapshot.dataset,
        snapshot.fixture ? "true" : "false",
      ]);
    }
  }
  const table: ExportTable = { header, rows };
  const metadata = {
    snapshotId: snapshot.snapshotId,
    calculationVersion: snapshot.calculationVersion,
    effectiveCutoff: snapshot.effectiveCutoff,
    valuationCutoff: snapshot.valuationCutoff,
    knowledgeCutoff: snapshot.knowledgeCutoff,
    vintage: snapshot.vintage,
    dataset: snapshot.dataset,
    fixture: snapshot.fixture,
    annualMode: snapshot.annualMode,
    historyWindow: snapshot.historyWindow,
    perMetricId: snapshot.perMetricId,
    pbrMetricId: snapshot.pbrMetricId,
    cards: snapshot.cards.map((c) => ({
      indexId: c.indexId,
      per: c.per.value,
      pbr: c.pbr.value,
      perSeries: c.per.seriesId,
      pbrSeries: c.pbr.seriesId,
    })),
    note: snapshot.fixture
      ? "연습 표본입니다. 시장 데이터가 아닙니다."
      : "가져온 자료 또는 빈 상태입니다. 라이브 제공자 수집이 확인된 것이 아닙니다.",
  };
  return { csv: tableToCsv(table), metadata: JSON.stringify(metadata, null, 2) };
}

export const METRIC_OPTIONS = METRICS;
