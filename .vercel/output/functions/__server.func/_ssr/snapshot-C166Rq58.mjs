import { A as monthIndex, D as lastCompletedMonth, I as seoulDate, L as strictRevisionAllowed, M as parseDecimal, O as metricById, _ as decDiv, a as CRISIS_WINDOWS, g as decCmp, h as decAdd, i as CALCULATION_VERSION, j as monthsInclusive, k as monthBefore, o as HISTORY_START, p as crossCompatible, s as INDICES, u as REQUESTED_CUTOFF, v as descriptiveRevisionAllowed, x as formatDecimal, y as discountPercent, z as ymOf } from "./compare-DexODRht.mjs";
import { a as monthEndSession, i as latestCompletedSession, n as calendarConfidence, r as indexCalendar, t as CALENDAR_NOTE } from "./calendar-DHkp_2Fz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/snapshot-C166Rq58.js
function judgeFreshness(input) {
	if (!input.latestObservedDate) return "no_data";
	if (!input.expectedSession) return "stale";
	if (input.latestObservedDate >= input.expectedSession) return "fresh";
	const latestMonth = monthIndex(input.latestObservedDate.slice(0, 7));
	if (monthIndex(input.expectedSession.slice(0, 7)) - latestMonth <= 1) return "awaiting_publication";
	return "stale";
}
function referenceWindow(input) {
	const historyStart = input.historyStart ?? "2000-01";
	const completed = lastCompletedMonth(input.cutoffIso);
	const currentPeriod = ymOf(input.currentObservationDate);
	const referenceEnd = monthIndex(monthBefore(currentPeriod)) < monthIndex(completed) ? monthBefore(currentPeriod) : completed;
	const requested = monthsInclusive(historyStart, completed);
	const reference = monthsInclusive(historyStart, referenceEnd);
	return {
		historyStart,
		lastCompletedMonth: completed,
		requestedEnd: completed,
		requestedMonthCount: requested.length,
		currentPeriod,
		referenceEnd,
		referenceMonthCount: reference.length
	};
}
function inCrisis(month) {
	return CRISIS_WINDOWS.some((w) => month >= w.start && month <= w.end);
}
/**
* Build a monthly grid. Daily points become a month only when the source has
* the calendar's final session. Quarterly points are not copied into three months.
*/
function monthlyGrid(input) {
	const months = monthsInclusive(input.start, input.end);
	if (input.points.some((p) => p.frequency === "quarterly")) return {
		cells: months.map((month) => ({
			month,
			state: "missing_inferred",
			value: null,
			observationDate: null,
			explicitSourceRow: false,
			inCrisis: inCrisis(month)
		})),
		frequencyNote: "분기 관측을 월 3개로 복제하지 않습니다."
	};
	const byMonth = /* @__PURE__ */ new Map();
	for (const point of input.points) {
		const month = ymOf(point.observationDate);
		const list = byMonth.get(month) ?? [];
		list.push(point);
		byMonth.set(month, list);
	}
	const calendar = indexCalendar(input.indexId);
	return {
		cells: months.map((month) => {
			const group = byMonth.get(month) ?? [];
			const base = {
				month,
				inCrisis: inCrisis(month)
			};
			if (group.length === 0) return {
				...base,
				state: "missing_inferred",
				value: null,
				observationDate: null,
				explicitSourceRow: false
			};
			if (group.some((p) => p.frequency === "daily_close")) {
				const expected = monthEndSession(calendar, month);
				const hit = expected ? group.find((p) => p.observationDate === expected) : void 0;
				if (!hit) return {
					...base,
					state: "missing_inferred",
					value: null,
					observationDate: expected,
					explicitSourceRow: false
				};
				return cellFromPoint(base, hit);
			}
			const chosen = [...group].sort((a, b) => a.observationDate < b.observationDate ? 1 : -1)[0];
			return cellFromPoint(base, chosen);
		}),
		frequencyNote: null
	};
}
function cellFromPoint(base, point) {
	if (point.status === "source_conflict" || point.status === "quarantined") return {
		...base,
		state: "conflict",
		value: null,
		observationDate: point.observationDate,
		explicitSourceRow: true
	};
	if (point.status === "not_meaningful") return {
		...base,
		state: "not_meaningful",
		value: null,
		observationDate: point.observationDate,
		explicitSourceRow: true
	};
	if (point.status === "missing" || point.value == null) return {
		...base,
		state: point.explicitSourceRow ? "missing_explicit" : "missing_inferred",
		value: null,
		observationDate: point.observationDate,
		explicitSourceRow: point.explicitSourceRow
	};
	return {
		...base,
		state: "numeric",
		value: point.value,
		observationDate: point.observationDate,
		explicitSourceRow: true
	};
}
function coverageGate(input) {
	const expected = input.cells.length;
	let observed = 0;
	let numeric = 0;
	let notMeaningful = 0;
	let inferredMissing = 0;
	let missingRun = 0;
	let longest = 0;
	let crisisMissing = 0;
	let anyMissing = 0;
	for (const cell of input.cells) if (cell.state === "numeric") {
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
	const reasons = [];
	const observedCoverage = expected === 0 ? "0" : formatRatioNumber(observed / expected);
	const numericCoverage = expected === 0 ? "0" : formatRatioNumber(numeric / expected);
	if (numeric < 48) reasons.push("numeric_below_48");
	if (expected === 0 || numeric / expected < .8) reasons.push("numeric_coverage_below_80");
	if (expected === 0 || observed / expected < .95) reasons.push("observed_coverage_below_95");
	const first = input.cells[0];
	const startCovered = first != null && first.month === input.expectedStart && first.state !== "missing_inferred";
	if (!startCovered) reasons.push("requested_start_not_covered");
	if (input.methodologyBreak) reasons.push("methodology_break");
	if (!input.definitionsKnown) reasons.push("definition_unknown");
	if (!input.freshnessOk) reasons.push("freshness");
	if (input.unresolvedConflict) reasons.push("unresolved_conflict");
	if (input.distributionMismatch) reasons.push("distribution_mismatch");
	let partialStart = null;
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
		partialStart
	};
}
function formatRatioNumber(n) {
	return (Math.round(n * 1e4) / 1e4).toString();
}
function annualTable(input) {
	const rows = [];
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
					expectedMonths
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
					expectedMonths
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
				expectedMonths
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
				expectedMonths
			});
			continue;
		}
		let sum = 0n;
		for (const cell of numeric) sum = decAdd(sum, parseDecimal(cell.value));
		rows.push({
			year,
			label,
			value: formatDecimal(decDiv(sum, parseDecimal(String(numeric.length)))),
			observationDate: null,
			reason: null,
			count: numeric.length,
			expectedMonths
		});
	}
	return rows;
}
function noteJanuary(points) {
	const notes = [];
	if (points.some((p) => p.observationDate.endsWith("-01-31") || /-01-\d{2}$/.test(p.observationDate) && p.observationDate.slice(5, 7) === "01")) notes.push("1월 관측은 전년 12월 말로 옮기지 않습니다.");
	return notes;
}
function trailingBounds(referenceEnd, months) {
	const start = monthIndex(referenceEnd) - (months - 1);
	const y = Math.floor(start / 12);
	const m = start % 12 + 1;
	return {
		start: `${y}-${String(m).padStart(2, "0")}`,
		end: referenceEnd
	};
}
/** Midrank percentile. Empty sample returns null. */
function midrankPercentile(sample, x) {
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
	const scaled = num * 10n ** 8n / den;
	const rounded = num * 10n ** 8n % den * 2n >= den ? scaled + 1n : scaled;
	return formatDecimal(rounded);
}
/**
* Hyndman–Fan type 7. h = (N - 1) * p, linear interpolation.
* p outside [0, 1] is clamped. Empty sample returns null.
*/
function quantileType7(sample, p) {
	if (sample.length === 0) return null;
	const pc = Math.min(1, Math.max(0, p));
	const sorted = [...sample].sort((a, b) => decCmp(parseDecimal(a), parseDecimal(b)));
	if (sorted.length === 1) return formatDecimal(parseDecimal(sorted[0]));
	const h = (sorted.length - 1) * pc;
	const lo = Math.floor(h);
	const hi = Math.ceil(h);
	if (lo === hi) return formatDecimal(parseDecimal(sorted[lo]));
	const weight = h - lo;
	const a = parseDecimal(sorted[lo]);
	const b = parseDecimal(sorted[hi]);
	const w = parseDecimal(weight.toFixed(8));
	const one = parseDecimal("1");
	const mixed = decAdd(decMulSafe(a, decSubSafe(one, w)), decMulSafe(b, w));
	return formatDecimal(mixed);
}
function decSubSafe(a, b) {
	return a - b;
}
function decMulSafe(a, b) {
	const f = 10n ** 8n;
	const n = a * b;
	const neg = n < 0n;
	const an = neg ? -n : n;
	const q = an / f;
	const out = an % f * 2n >= f ? q + 1n : q;
	return neg ? -out : out;
}
function descriptiveStats(rows) {
	if (rows.length === 0) return {
		n: 0,
		min: null,
		max: null,
		mean: null,
		median: null,
		p10: null,
		p25: null,
		p75: null,
		p90: null
	};
	const values = rows.map((r) => r.value);
	let minV = parseDecimal(rows[0].value);
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
		min: {
			value: min,
			dates: rows.filter((r) => decCmp(parseDecimal(r.value), minV) === 0).map((r) => r.date)
		},
		max: {
			value: max,
			dates: rows.filter((r) => decCmp(parseDecimal(r.value), maxV) === 0).map((r) => r.date)
		},
		mean,
		median: quantileType7(values, .5),
		p10: quantileType7(values, .1),
		p25: quantileType7(values, .25),
		p75: quantileType7(values, .75),
		p90: quantileType7(values, .9)
	};
}
function positionLabel(percentile) {
	const p = parseDecimal(percentile);
	if (decCmp(p, parseDecimal("10")) < 0) return "역사적 낮은 구간";
	if (decCmp(p, parseDecimal("30")) < 0) return "낮은 구간";
	if (decCmp(p, parseDecimal("70")) < 0) return "중간 구간";
	if (decCmp(p, parseDecimal("90")) < 0) return "높은 구간";
	return "역사적 상위 구간";
}
var FORMULA = /^[=+@\t\r-]/;
function protectCsvField(value, numeric) {
	if (numeric && /^-?\d+(\.\d+)?$/.test(value)) return value;
	const safe = FORMULA.test(value) ? `'${value}` : value;
	if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, "\"\"")}"`;
	return safe;
}
function tableToCsv(table) {
	const lines = [table.header.map((h) => protectCsvField(h, false)).join(",")];
	for (const row of table.rows) lines.push(row.map((cell, i) => {
		const key = table.header[i] ?? "";
		return protectCsvField(cell ?? "", key === "value" || key === "percentile" || key === "discount_percent");
	}).join(","));
	return `\uFEFF${lines.join("\n")}\n`;
}
function fnv(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i += 1) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
}
function effectiveInstant(mode, executionIso) {
	if (mode === "live") return new Date(executionIso).toISOString();
	const requested = new Date(REQUESTED_CUTOFF).getTime();
	const exec = new Date(executionIso).getTime();
	return new Date(Math.min(requested, exec)).toISOString();
}
function emptySlot(metricId) {
	return {
		seriesId: null,
		metricId,
		metricLabel: metricById(metricId)?.label ?? metricId,
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
		referenceMonthCount: null
	};
}
function definitionsKnown(series) {
	return [
		series.earningsBasis,
		series.lossTreatment,
		series.aggregationMethod,
		series.indexWeighting,
		series.negativeEquityTreatment,
		series.dateSemantics
	].every((f) => f && f !== "unknown" && f !== "unspecified");
}
function buildSnapshot(input) {
	const valuationCutoff = effectiveInstant(input.mode, input.executionIso);
	const knowledgeCutoff = input.vintage === "STRICT_AS_KNOWN" ? valuationCutoff : new Date(input.executionIso).toISOString();
	const cutoffs = {
		valuationCutoff,
		knowledgeCutoff
	};
	const selected = input.series.filter((s) => input.dataset === "fixture" ? s.datasetKind === "fixture" : s.datasetKind !== "fixture");
	let strictBlocked = false;
	const visibleSeries = selected.map((series) => {
		const points = series.points.filter((point) => {
			const verdict = input.vintage === "STRICT_AS_KNOWN" ? strictRevisionAllowed(point, cutoffs) : descriptiveRevisionAllowed(point, cutoffs);
			if (input.vintage === "STRICT_AS_KNOWN" && !verdict.ok) strictBlocked = true;
			return verdict.ok;
		});
		return {
			...series,
			points
		};
	});
	const sessions = INDICES.filter((i) => i.role === "primary").map((index) => {
		const session = latestCompletedSession(index.calendarId, valuationCutoff);
		return {
			indexId: index.id,
			session,
			confidence: session ? calendarConfidence(index.calendarId, session) : "partial_weekend_only"
		};
	});
	const seriesViews = [];
	const coverage = [];
	const slotByKey = /* @__PURE__ */ new Map();
	const currentBySeries = /* @__PURE__ */ new Map();
	for (const series of visibleSeries) {
		const current = pickCurrent(series.points);
		currentBySeries.set(series.seriesId, current);
		const calendar = indexCalendar(series.indexId);
		const expectedSession = series.frequency === "daily_close" ? latestCompletedSession(calendar, valuationCutoff) : null;
		const completedMonth = lastCompletedMonth(valuationCutoff);
		const latestDate = current?.observationDate ?? null;
		const freshState = judgeFreshness({
			latestObservedDate: latestDate,
			expectedSession: series.frequency === "daily_close" ? expectedSession : `${completedMonth}-01`
		});
		const freshnessOk = freshState === "fresh" || freshState === "awaiting_publication";
		if (!current) {
			coverage.push(blankCoverage(series));
			continue;
		}
		const ref = referenceWindow({
			currentObservationDate: current.observationDate,
			cutoffIso: valuationCutoff
		});
		const grid = monthlyGrid({
			points: series.points.map((p) => ({
				observationDate: p.observationDate,
				value: p.value,
				status: p.status,
				frequency: series.frequency,
				explicitSourceRow: p.explicitSourceRow,
				indexId: series.indexId
			})),
			start: HISTORY_START,
			end: ref.requestedEnd,
			indexId: series.indexId
		});
		const windowStart = input.historyWindow === "since_2000" ? HISTORY_START : trailingBounds(ref.referenceEnd, input.historyWindow === "trailing_10y" ? 120 : 60).start;
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
			distributionMismatch: mismatch
		});
		const numericRows = sampleCells.filter((c) => c.state === "numeric" && c.value).map((c) => ({
			value: c.value,
			date: c.observationDate ?? c.month
		}));
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
		const slot = {
			seriesId: series.seriesId,
			metricId: series.metricId,
			metricLabel: metric?.label ?? series.metricId,
			value: current.status === "valid" ? current.value : null,
			statusText: current.status === "valid" ? current.isEstimate ? "앱 또는 제공자 추정치" : "관측" : current.status === "not_meaningful" ? "의미 없음" : current.status === "source_conflict" ? "출처 충돌" : "자료 없음",
			observationDate: current.observationDate,
			priceAsOf: current.priceAsOf,
			financialPeriodEnd: current.financialPeriodEnd,
			isEstimate: current.isEstimate,
			estimateOrigin: current.estimateOrigin,
			providerId: series.providerId,
			freshness: freshState === "fresh" ? "기대 시점 반영" : freshState === "awaiting_publication" ? "최신 공표 대기" : freshState === "no_data" ? "자료 없음" : "이전 자료 유지",
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
			referenceMonthCount: ref.referenceMonthCount
		};
		slotByKey.set(`${series.indexId}:${series.metricId}`, slot);
		const chartCells = sampleCells;
		seriesViews.push({
			seriesId: series.seriesId,
			indexId: series.indexId,
			metricId: series.metricId,
			chart: chartCells.map((c) => ({
				month: c.month,
				value: c.state === "numeric" ? c.value : null
			})),
			current: ymOfSafe(current.observationDate) > ref.referenceEnd ? {
				month: ymOfSafe(current.observationDate),
				value: current.value,
				date: current.observationDate
			} : {
				month: ymOfSafe(current.observationDate),
				value: current.value,
				date: current.observationDate
			},
			bands: {
				p10: stats.p10,
				median: stats.median,
				p90: stats.p90
			},
			qualification: {
				qualified,
				reasons: gate.reasons,
				observedCoverage: gate.observedCoverage,
				numericCoverage: gate.numericCoverage
			},
			stats,
			referenceEnd: ref.referenceEnd,
			windowStart,
			interpolated: series.interpolated,
			dateSemantics: series.dateSemantics
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
			longestMissingRun: gate.longestMissingRun
		});
	}
	const cards = INDICES.filter((i) => i.role === "primary").map((index) => ({
		indexId: index.id,
		displayName: index.displayName,
		per: slotByKey.get(`${index.id}:${input.perMetricId}`) ?? emptySlot(input.perMetricId),
		pbr: slotByKey.get(`${index.id}:${input.pbrMetricId}`) ?? emptySlot(input.pbrMetricId)
	}));
	const annual = buildAnnual(visibleSeries, input.annualMode, valuationCutoff, input.perMetricId, input.pbrMetricId);
	const relatives = buildRelatives(visibleSeries, currentBySeries, input.perMetricId);
	return {
		snapshotId: `snap_${fnv(JSON.stringify({
			calculationVersion: CALCULATION_VERSION,
			valuationCutoff,
			knowledgeCutoff,
			vintage: input.vintage,
			dataset: input.dataset,
			annualMode: input.annualMode,
			historyWindow: input.historyWindow,
			perMetricId: input.perMetricId,
			pbrMetricId: input.pbrMetricId,
			revisions: visibleSeries.flatMap((s) => s.points.map((p) => p.revisionId)).sort()
		}))}`,
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
		strictBlocked: input.vintage === "STRICT_AS_KNOWN" && strictBlocked
	};
}
function ymOfSafe(date) {
	return date.slice(0, 7);
}
function pickCurrent(points) {
	const usable = points.filter((p) => p.status !== "quarantined");
	if (usable.length === 0) return null;
	return [...usable].sort((a, b) => {
		const ak = a.sessionCloseAt ?? a.observationDate;
		const bk = b.sessionCloseAt ?? b.observationDate;
		if (ak === bk) return a.revisionId < b.revisionId ? 1 : -1;
		return ak < bk ? 1 : -1;
	})[0];
}
function blankCoverage(series) {
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
		longestMissingRun: 0
	};
}
function buildAnnual(series, mode, cutoff, perMetric, pbrMetric) {
	const completed = lastCompletedMonth(cutoff);
	const lastYear = Number(completed.slice(0, 4));
	const ytdYear = completed.endsWith("-12") ? null : lastYear;
	const wanted = /* @__PURE__ */ new Set([perMetric, pbrMetric]);
	const notes = /* @__PURE__ */ new Set();
	const byKey = /* @__PURE__ */ new Map();
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
				indexId: item.indexId
			})),
			start: HISTORY_START,
			end: completed,
			indexId: item.indexId
		});
		byKey.set(`${item.indexId}:${item.metricId}`, grid.cells);
		for (const note of noteJanuary(item.points)) notes.add(note);
	}
	const rows = [];
	for (let year = 2e3; year <= lastYear; year += 1) {
		const cells = {};
		for (const index of INDICES.filter((i) => i.role === "primary")) for (const metricId of [perMetric, pbrMetric]) {
			const key = `${index.id}:${metricId}`;
			const cell = annualTable({
				cells: byKey.get(key) ?? [],
				mode,
				firstYear: year,
				lastYear: year,
				ytdYear,
				januaryNotes: []
			})[0];
			cells[key] = {
				value: cell?.value ?? null,
				reason: cell?.reason ?? "자료 없음",
				count: cell?.count ?? null,
				date: cell?.observationDate ?? null
			};
		}
		rows.push({
			year,
			label: ytdYear === year ? "ytd" : "completed",
			cells
		});
	}
	return {
		rows,
		notes: [...notes]
	};
}
function buildRelatives(series, currentBySeries, metricId) {
	const group = series.filter((s) => s.metricId === metricId && INDICES.some((i) => i.id === s.indexId && i.role === "primary"));
	const out = [];
	for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
		const left = group[i];
		const right = group[j];
		const compat = crossCompatible({
			metricId: left.metricId,
			family: metricById(left.metricId)?.family ?? "per",
			earningsBasis: left.earningsBasis,
			lossTreatment: left.lossTreatment,
			aggregationMethod: left.aggregationMethod,
			indexWeighting: left.indexWeighting,
			negativeEquityTreatment: left.negativeEquityTreatment,
			frequency: left.frequency,
			dateSemantics: left.dateSemantics
		}, {
			metricId: right.metricId,
			family: metricById(right.metricId)?.family ?? "per",
			earningsBasis: right.earningsBasis,
			lossTreatment: right.lossTreatment,
			aggregationMethod: right.aggregationMethod,
			indexWeighting: right.indexWeighting,
			negativeEquityTreatment: right.negativeEquityTreatment,
			frequency: right.frequency,
			dateSemantics: right.dateSemantics
		});
		const lc = currentBySeries.get(left.seriesId) ?? null;
		const rc = currentBySeries.get(right.seriesId) ?? null;
		const monthsL = new Set(left.points.filter((p) => p.status === "valid").map((p) => p.observationDate.slice(0, 7)));
		const monthsR = new Set(right.points.filter((p) => p.status === "valid").map((p) => p.observationDate.slice(0, 7)));
		let common = 0;
		for (const month of monthsL) if (monthsR.has(month)) common += 1;
		const lost = monthsL.size + monthsR.size - 2 * common;
		const discount = compat.ok && lc?.value && rc?.value && lc.status === "valid" && rc.status === "valid" ? discountPercent(lc.value, rc.value) : null;
		out.push({
			leftId: left.seriesId,
			rightId: right.seriesId,
			leftIndex: left.indexId,
			rightIndex: right.indexId,
			metricId,
			enabled: Boolean(discount),
			reason: compat.ok ? discount ? null : "nonpositive_or_missing" : compat.reason,
			discountPercent: discount?.value ?? null,
			direction: discount?.direction ?? null,
			leftValue: lc?.status === "valid" ? lc.value : null,
			rightValue: rc?.status === "valid" ? rc.value : null,
			leftDate: lc?.observationDate ?? null,
			rightDate: rc?.observationDate ?? null,
			commonMonths: common,
			lostMonths: lost
		});
	}
	return out;
}
function snapshotExports(snapshot) {
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
		"fixture"
	];
	const rows = [];
	for (const row of snapshot.annual) for (const [key, cell] of Object.entries(row.cells)) {
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
			snapshot.fixture ? "true" : "false"
		]);
	}
	const table = {
		header,
		rows
	};
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
			pbrSeries: c.pbr.seriesId
		})),
		note: snapshot.fixture ? "연습 표본입니다. 시장 데이터가 아닙니다." : "가져온 자료 또는 빈 상태입니다. 라이브 제공자 수집이 확인된 것이 아닙니다."
	};
	return {
		csv: tableToCsv(table),
		metadata: JSON.stringify(metadata, null, 2)
	};
}
//#endregion
export { buildSnapshot, snapshotExports };
