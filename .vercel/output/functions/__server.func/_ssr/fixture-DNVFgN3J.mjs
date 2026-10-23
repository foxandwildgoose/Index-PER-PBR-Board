import { A as monthIndex, o as HISTORY_START, w as fromMonthIndex } from "./compare-DexODRht.mjs";
import { a as monthEndSession } from "./calendar-DHkp_2Fz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fixture-DNVFgN3J.js
/**
* Deterministic practice sample. The numbers are a function of the month index.
* They are not market observations and must stay labeled as a fixture.
*/
var FIXTURE_FORMULA = "PER = 10 + (월순번 mod 17) + 0.25, 단 2009-03은 86.5. PBR = 1 + (월순번 mod 9) + 0.2. 2009-02 PER은 의미 없음.";
function months(start, end) {
	const out = [];
	for (let i = monthIndex(start); i <= monthIndex(end); i += 1) out.push(fromMonthIndex(i));
	return out;
}
function point(seriesId, date, value, status, reason) {
	return {
		revisionId: `fix:${seriesId}:${date}`,
		observationDate: date,
		sessionCloseAt: null,
		value,
		status,
		reasonCode: reason,
		priceAsOf: date,
		financialPeriodEnd: date,
		availableAt: date,
		availabilityPrecision: "date",
		retrievedAt: "2026-10-23T00:40:00.000Z",
		isEstimate: false,
		estimateOrigin: "none",
		denominatorStatus: status === "not_meaningful" ? "negative" : "positive",
		denominatorEvidence: "source_explicit",
		sourceUrl: "fixture://practice-sample",
		vintageMode: "point_in_time",
		explicitSourceRow: true
	};
}
function buildMonthly(input) {
	const calendar = input.indexId === "KOSPI" || input.indexId === "KOSDAQ" ? "XKRX" : "XNYS";
	return months(input.start, input.end).map((ym) => {
		const date = monthEndSession(calendar, ym) ?? `${ym}-28`;
		const i = monthIndex(ym) - monthIndex(HISTORY_START);
		if (input.notMeaningfulMonth === ym) return point(input.seriesId, date, null, "not_meaningful", "nonpositive_denominator");
		if (input.kind === "per" && input.spikeMonth === ym) return point(input.seriesId, date, "86.5", "valid", "earnings_collapse_kept");
		const value = input.kind === "per" ? `${10 + i % 17}.25` : `${1 + i % 9}.2`;
		return point(input.seriesId, date, value, "valid", null);
	});
}
var known = {
	earningsBasis: "ttm_reported",
	lossTreatment: "include_losses_in_aggregate",
	aggregationMethod: "aggregate_earnings_over_aggregate_price",
	indexWeighting: "float_adjusted",
	negativeEquityTreatment: "not_meaningful_if_nonpositive",
	dateSemantics: "month_end_close",
	methodologyVersion: "fixture-1",
	methodologyBreak: false,
	interpolated: false,
	frequency: "monthly_close",
	datasetKind: "fixture",
	providerId: "fixture"
};
function practiceSeries() {
	const end = "2026-09";
	const spPer = "fixture:SP500:PER_TTM_REPORTED";
	const spPbr = "fixture:SP500:PBR_COMMON_EQUITY";
	const nqPer = "fixture:NASDAQ_COMPOSITE:PER_TTM_REPORTED";
	const kospiFy = "fixture:KOSPI:PER_FY0";
	return [
		{
			...known,
			seriesId: spPer,
			indexId: "SP500",
			metricId: "PER_TTM_REPORTED",
			points: buildMonthly({
				seriesId: spPer,
				indexId: "SP500",
				start: HISTORY_START,
				end,
				kind: "per",
				notMeaningfulMonth: "2009-02",
				spikeMonth: "2009-03"
			})
		},
		{
			...known,
			seriesId: spPbr,
			indexId: "SP500",
			metricId: "PBR_COMMON_EQUITY",
			earningsBasis: "not_applicable",
			points: buildMonthly({
				seriesId: spPbr,
				indexId: "SP500",
				start: HISTORY_START,
				end,
				kind: "pbr"
			})
		},
		{
			...known,
			seriesId: nqPer,
			indexId: "NASDAQ_COMPOSITE",
			metricId: "PER_TTM_REPORTED",
			lossTreatment: "exclude_losses",
			points: buildMonthly({
				seriesId: nqPer,
				indexId: "NASDAQ_COMPOSITE",
				start: HISTORY_START,
				end,
				kind: "per"
			})
		},
		{
			...known,
			seriesId: kospiFy,
			indexId: "KOSPI",
			metricId: "PER_FY0",
			earningsBasis: "fy0",
			points: buildMonthly({
				seriesId: kospiFy,
				indexId: "KOSPI",
				start: "2010-01",
				end,
				kind: "per"
			})
		}
	];
}
//#endregion
export { practiceSeries as n, FIXTURE_FORMULA as t };
