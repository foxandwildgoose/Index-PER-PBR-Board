import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { F as providerById, O as metricById, T as isDecimalString, c as METRICS, d as classifyDenominator, f as classifyIncoming, l as PROVIDERS, n as ALLOWED_METRIC_IDS, r as AUDIT_DATE, s as INDICES, t as ALLOWED_INDEX_IDS } from "./compare-DexODRht.mjs";
import { a as string, i as object, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-D7o2n9Bl.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var MAX_CHARS = 15e5;
var MAX_ROWS = 2e4;
var DATE = /^\d{4}-\d{2}-\d{2}$/;
var FORMULA = /^[=+@\t\r]/;
var HEADER = [
	"index_id",
	"metric_id",
	"observation_date",
	"value",
	"status",
	"price_as_of",
	"financial_period_end",
	"available_at",
	"availability_precision",
	"is_estimate",
	"estimate_origin",
	"denominator_status",
	"denominator_evidence",
	"source_url",
	"methodology_version",
	"vintage_mode",
	"frequency",
	"date_semantics",
	"earnings_basis",
	"provider_id",
	"reason_code",
	"session_close_at",
	"loss_treatment",
	"aggregation_method",
	"index_weighting",
	"negative_equity_treatment",
	"zero_is_sentinel"
];
function templateCsv() {
	return `${HEADER.join(",")}\n${[
		"SP500",
		"PER_TTM_REPORTED",
		"2009-03-31",
		"86.5",
		"valid",
		"2009-03-31",
		"2008-12-31",
		"2009-04-15",
		"date",
		"false",
		"none",
		"positive",
		"source_explicit",
		"https://example.test/licensed-export",
		"provider-v1",
		"point_in_time",
		"monthly_close",
		"month_end_close",
		"ttm_reported",
		"manual_upload",
		"",
		"",
		"include_losses_in_aggregate",
		"aggregate_earnings_over_aggregate_price",
		"float_adjusted",
		"not_meaningful_if_nonpositive",
		"no"
	].join(",")}\n`;
}
function parseCsv(text) {
	const rows = [];
	let row = [];
	let cell = "";
	let quote = false;
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (quote) {
			if (ch === "\"") {
				if (text[i + 1] === "\"") {
					cell += "\"";
					i += 1;
				} else quote = false;
			} else cell += ch;
		} else if (ch === "\"") quote = true;
		else if (ch === ",") {
			row.push(cell);
			cell = "";
		} else if (ch === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
		} else if (ch !== "\r") cell += ch;
	}
	if (cell.length > 0 || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
function formula(value) {
	return FORMULA.test(value);
}
function previewImport(text) {
	const warnings = [];
	if (text.length > MAX_CHARS) return {
		ok: false,
		inserts: [],
		rejected: [{
			line: 0,
			reason: "file_too_large",
			raw: ""
		}],
		fetchedHosts: [],
		warnings
	};
	if (text.includes("\0")) return {
		ok: false,
		inserts: [],
		rejected: [{
			line: 0,
			reason: "binary_rejected",
			raw: ""
		}],
		fetchedHosts: [],
		warnings
	};
	const table = parseCsv(text);
	if (table.length === 0) return {
		ok: false,
		inserts: [],
		rejected: [{
			line: 1,
			reason: "empty",
			raw: ""
		}],
		fetchedHosts: [],
		warnings
	};
	const header = table[0].map((h) => h.trim());
	const missing = [
		"index_id",
		"metric_id",
		"observation_date",
		"source_url"
	].filter((k) => !header.includes(k));
	if (missing.length > 0) return {
		ok: false,
		inserts: [],
		rejected: [{
			line: 1,
			reason: `missing_columns:${missing.join("|")}`,
			raw: header.join(",")
		}],
		fetchedHosts: [],
		warnings
	};
	const idx = (name) => header.indexOf(name);
	const inserts = [];
	const rejected = [];
	const body = table.slice(1);
	if (body.length > MAX_ROWS) return {
		ok: false,
		inserts: [],
		rejected: [{
			line: 0,
			reason: "too_many_rows",
			raw: ""
		}],
		fetchedHosts: [],
		warnings
	};
	body.forEach((cols, i) => {
		const line = i + 2;
		const get = (name) => idx(name) >= 0 ? (cols[idx(name)] ?? "").trim() : "";
		const raw = cols.join(",");
		if (header.map((name, n) => ({
			name,
			value: (cols[n] ?? "").trim()
		})).filter((f) => f.name !== "value" && f.value !== "").some((f) => formula(f.value))) {
			rejected.push({
				line,
				reason: "formula_injection",
				raw
			});
			return;
		}
		const indexId = get("index_id");
		const metricId = get("metric_id");
		const observationDate = get("observation_date");
		if (!ALLOWED_INDEX_IDS.has(indexId)) {
			rejected.push({
				line,
				reason: "unknown_index",
				raw
			});
			return;
		}
		if (!ALLOWED_METRIC_IDS.has(metricId)) {
			rejected.push({
				line,
				reason: "unknown_metric",
				raw
			});
			return;
		}
		if (!DATE.test(observationDate)) {
			rejected.push({
				line,
				reason: "ambiguous_or_invalid_date",
				raw
			});
			return;
		}
		for (const name of ["price_as_of", "financial_period_end"]) {
			const v = get(name);
			if (v && !DATE.test(v)) {
				rejected.push({
					line,
					reason: "ambiguous_or_invalid_date",
					raw
				});
				return;
			}
		}
		const sourceUrl = get("source_url");
		if (!sourceUrl || formula(sourceUrl)) {
			rejected.push({
				line,
				reason: "source_url_required",
				raw
			});
			return;
		}
		const valueRaw = get("value");
		if (valueRaw && !isDecimalString(valueRaw)) {
			rejected.push({
				line,
				reason: "invalid_number",
				raw
			});
			return;
		}
		const metric = metricById(metricId);
		const providerId = get("provider_id") || "manual_upload";
		if (!providerById(providerId) || providerId === "fixture") {
			rejected.push({
				line,
				reason: "unknown_provider",
				raw
			});
			return;
		}
		const precision = get("availability_precision") || "unknown";
		if (![
			"timestamp",
			"date",
			"unknown"
		].includes(precision)) {
			rejected.push({
				line,
				reason: "bad_precision",
				raw
			});
			return;
		}
		const frequency = get("frequency") || "monthly_close";
		if (![
			"daily_close",
			"monthly_close",
			"monthly_average",
			"quarterly",
			"annual"
		].includes(frequency)) {
			rejected.push({
				line,
				reason: "bad_frequency",
				raw
			});
			return;
		}
		const originIn = get("estimate_origin") || "none";
		const classified = classifyIncoming({
			declaredEstimate: get("is_estimate") === "true" || get("is_estimate") === "yes",
			estimateOrigin: [
				"provider",
				"application",
				"scenario",
				"none"
			].includes(originIn) ? originIn : "none",
			rollForward: get("reason_code") === "price_roll_forward"
		});
		const denom = get("denominator_status") || "unknown";
		if (![
			"positive",
			"zero",
			"negative",
			"unknown"
		].includes(denom)) {
			rejected.push({
				line,
				reason: "bad_denominator",
				raw
			});
			return;
		}
		const cleaned = classifyDenominator({
			value: valueRaw || null,
			denominatorStatus: denom,
			zeroIsSentinel: get("zero_is_sentinel") === "yes" || get("zero_is_sentinel") === "true"
		});
		const statusIn = get("status");
		let status = cleaned.status;
		if (statusIn === "not_meaningful") status = "not_meaningful";
		if (statusIn === "missing") status = "missing";
		if (statusIn && ![
			"valid",
			"missing",
			"not_meaningful",
			""
		].includes(statusIn)) {
			rejected.push({
				line,
				reason: "bad_status",
				raw
			});
			return;
		}
		const earningsBasis = get("earnings_basis") || metric.earningsBasis;
		inserts.push({
			indexId,
			metricId,
			observationDate,
			value: status === "valid" ? cleaned.value : status === "not_meaningful" ? cleaned.value : null,
			status,
			reasonCode: get("reason_code") || cleaned.reason,
			priceAsOf: get("price_as_of") || null,
			financialPeriodEnd: get("financial_period_end") || null,
			availableAt: get("available_at") || null,
			availabilityPrecision: precision,
			isEstimate: classified.isEstimate,
			estimateOrigin: classified.estimateOrigin,
			denominatorStatus: denom,
			denominatorEvidence: get("denominator_evidence") || "unknown",
			sourceUrl,
			methodologyVersion: get("methodology_version") || "unspecified",
			vintageMode: get("vintage_mode") || "unknown",
			frequency,
			dateSemantics: get("date_semantics") || "unspecified",
			earningsBasis,
			providerId,
			sessionCloseAt: get("session_close_at") || null,
			lossTreatment: get("loss_treatment") || "unknown",
			aggregationMethod: get("aggregation_method") || "unknown",
			indexWeighting: get("index_weighting") || "unknown",
			negativeEquityTreatment: get("negative_equity_treatment") || "unknown",
			zeroIsSentinel: get("zero_is_sentinel") === "yes"
		});
	});
	if (inserts.some((r) => r.earningsBasis === "unknown" || r.metricId.includes("UNVERIFIED"))) warnings.push("정의가 미확인인 행은 표시할 수 있지만 합격 역사 구간이나 교차 비교에는 쓰이지 않습니다.");
	return {
		ok: rejected.length === 0,
		inserts,
		rejected,
		fetchedHosts: [],
		warnings
	};
}
var Filters = object({
	mode: _enum(["fixed", "live"]),
	vintage: _enum(["STRICT_AS_KNOWN", "CURRENT_VINTAGE_DESCRIPTIVE"]),
	dataset: _enum(["imported", "fixture"]),
	annualMode: _enum(["year_end", "annual_mean"]),
	historyWindow: _enum([
		"since_2000",
		"trailing_10y",
		"trailing_5y"
	]),
	perMetricId: string(),
	pbrMetricId: string()
});
async function db() {
	const { getSql } = await import("./db-_Iyif_J6.mjs");
	return getSql();
}
function gate(token) {
	const expected = process.env.INGEST_TOKEN;
	if (!expected) return "open_because_unset";
	if (token !== expected) throw new Error("관리 토큰이 맞지 않습니다.");
	return "ok";
}
var getDashboard_createServerFn_handler = createServerRpc({
	id: "2ae1fda00eb01e6bf527a491547e923255e781f33f47e15b2273d2300f4e4a71",
	name: "getDashboard",
	filename: "src/lib/valuation/api.ts"
}, (opts) => getDashboard.__executeServer(opts));
var getDashboard = createServerFn({ method: "POST" }).validator(Filters).handler(getDashboard_createServerFn_handler, async ({ data }) => {
	const { ensureRegistry, loadSeries, rejectionCount, saveSnapshot, listRuns } = await import("./repository-C9hZnwLq.mjs");
	const { buildSnapshot, snapshotExports } = await import("./snapshot-C166Rq58.mjs");
	const sql = await db();
	await ensureRegistry(sql);
	const snapshot = buildSnapshot({
		series: await loadSeries(sql),
		executionIso: (/* @__PURE__ */ new Date()).toISOString(),
		mode: data.mode,
		vintage: data.vintage,
		dataset: data.dataset,
		annualMode: data.annualMode,
		historyWindow: data.historyWindow,
		perMetricId: data.perMetricId,
		pbrMetricId: data.pbrMetricId,
		sourcedButRejected: await rejectionCount(sql)
	});
	await saveSnapshot(sql, snapshot.snapshotId, JSON.stringify({
		id: snapshot.snapshotId,
		cards: snapshot.cards
	}));
	const exp = snapshotExports(snapshot);
	return {
		snapshot,
		csv: exp.csv,
		metadata: exp.metadata,
		runs: await listRuns(sql),
		admin: process.env.INGEST_TOKEN ? "token_required" : "open_because_unset",
		auditDate: AUDIT_DATE,
		indices: INDICES,
		metrics: METRICS,
		providers: PROVIDERS.map((p) => ({
			id: p.id,
			name: p.name,
			availability: p.availability,
			storage: p.storage,
			cache: p.cache,
			privateDisplay: p.privateDisplay,
			publicDisplay: p.publicDisplay,
			export: p.export,
			documentationUrl: p.documentationUrl,
			notes: p.notes,
			metrics: p.metrics,
			history: p.history
		}))
	};
});
var previewUpload_createServerFn_handler = createServerRpc({
	id: "1c79812a9307bdf393a2f286af364c8cac0a7a761d936156c628e51733614137",
	name: "previewUpload",
	filename: "src/lib/valuation/api.ts"
}, (opts) => previewUpload.__executeServer(opts));
var previewUpload = createServerFn({ method: "POST" }).validator(object({
	csv: string().max(15e5),
	token: string().optional()
})).handler(previewUpload_createServerFn_handler, async ({ data }) => {
	gate(data.token);
	const { previewImport } = await import("./import-csv-D7AqjQ2Y.mjs");
	const { redact } = await import("./repository-C9hZnwLq.mjs");
	const preview = previewImport(data.csv);
	return {
		...preview,
		rejected: preview.rejected.map((row) => ({
			...row,
			raw: redact(row.raw).slice(0, 240)
		}))
	};
});
var commitUpload_createServerFn_handler = createServerRpc({
	id: "610e7d6e858390b1000f288a41f2e5a940963739d5e540fd6d71ca5703b02dfd",
	name: "commitUpload",
	filename: "src/lib/valuation/api.ts"
}, (opts) => commitUpload.__executeServer(opts));
var commitUpload = createServerFn({ method: "POST" }).validator(object({
	csv: string().max(15e5),
	token: string().optional()
})).handler(commitUpload_createServerFn_handler, async ({ data }) => {
	gate(data.token);
	const { previewImport } = await import("./import-csv-D7AqjQ2Y.mjs");
	const { commitRows, ensureRegistry, recordRun, rememberRejections, withLock, redact } = await import("./repository-C9hZnwLq.mjs");
	const preview = previewImport(data.csv);
	const sql = await db();
	await ensureRegistry(sql);
	const holder = `import_${Date.now()}`;
	if (!await withLock(sql, holder)) return {
		ok: false,
		error: "다른 가져오기가 진행 중입니다.",
		preview
	};
	if (preview.inserts.length === 0) {
		await rememberRejections(sql, preview.rejected);
		await recordRun(sql, {
			id: holder,
			providerId: "manual_upload",
			status: "rejected",
			error: null,
			rowsSeen: preview.rejected.length,
			rowsInserted: 0,
			rowsUnchanged: 0,
			rowsRejected: preview.rejected.length,
			lastObservation: null
		});
		return {
			ok: false,
			error: "반영할 행이 없습니다.",
			preview
		};
	}
	const result = await commitRows(sql, preview.inserts, "imported");
	await rememberRejections(sql, preview.rejected);
	await recordRun(sql, {
		id: holder,
		providerId: "manual_upload",
		status: "succeeded",
		error: null,
		rowsSeen: preview.inserts.length + preview.rejected.length,
		rowsInserted: result.inserted,
		rowsUnchanged: result.unchanged,
		rowsRejected: preview.rejected.length,
		lastObservation: preview.inserts.map((r) => r.observationDate).sort().at(-1) ?? null
	});
	return {
		ok: true,
		result,
		preview: {
			...preview,
			rejected: preview.rejected.map((r) => ({
				...r,
				raw: redact(r.raw).slice(0, 180)
			}))
		}
	};
});
var loadFixture_createServerFn_handler = createServerRpc({
	id: "567671c72657d1ff3d603f53b8edf61708f3cd0e1530abed84ad8d484813a2ee",
	name: "loadFixture",
	filename: "src/lib/valuation/api.ts"
}, (opts) => loadFixture.__executeServer(opts));
var loadFixture = createServerFn({ method: "POST" }).validator(object({ token: string().optional() })).handler(loadFixture_createServerFn_handler, async ({ data }) => {
	gate(data.token);
	const { ensureRegistry, loadPracticeFixture, recordRun } = await import("./repository-C9hZnwLq.mjs");
	const sql = await db();
	await ensureRegistry(sql);
	const result = await loadPracticeFixture(sql);
	await recordRun(sql, {
		id: `fixture_${Date.now()}`,
		providerId: "fixture",
		status: "succeeded",
		error: null,
		rowsSeen: result.inserted + result.unchanged,
		rowsInserted: result.inserted,
		rowsUnchanged: result.unchanged,
		rowsRejected: 0,
		lastObservation: "2026-09-30"
	});
	return {
		ok: true,
		result,
		label: "연습 표본"
	};
});
var refreshSources_createServerFn_handler = createServerRpc({
	id: "77179ce1ede29249823c6eb7ac1517ab5973acca01497ef7eac395ec88a0edc2",
	name: "refreshSources",
	filename: "src/lib/valuation/api.ts"
}, (opts) => refreshSources.__executeServer(opts));
var refreshSources = createServerFn({ method: "POST" }).validator(object({ token: string().optional() })).handler(refreshSources_createServerFn_handler, async ({ data }) => {
	gate(data.token);
	const { ensureRegistry, recordRun, listRuns } = await import("./repository-C9hZnwLq.mjs");
	const sql = await db();
	await ensureRegistry(sql);
	for (const provider of PROVIDERS) {
		if (provider.id === "fixture" || provider.id === "manual_upload") continue;
		const status = provider.availability === "ready" ? "no_new_publication" : provider.availability;
		await recordRun(sql, {
			id: `health_${provider.id}_${Date.now()}`,
			providerId: provider.id,
			status,
			error: provider.availability === "ready" ? null : provider.availability,
			rowsSeen: 0,
			rowsInserted: 0,
			rowsUnchanged: 0,
			rowsRejected: 0,
			lastObservation: null
		});
	}
	return {
		ok: true,
		runs: await listRuns(sql),
		note: "네트워크 수집은 하지 않았습니다. 자격과 이용 허락이 없는 출처는 상태만 기록합니다."
	};
});
var csvTemplate_createServerFn_handler = createServerRpc({
	id: "dadd08f83a606dd15fc0df1652bcd2c7944ccf90a887fcdd25411a50b50499b7",
	name: "csvTemplate",
	filename: "src/lib/valuation/api.ts"
}, (opts) => csvTemplate.__executeServer(opts));
var csvTemplate = createServerFn({ method: "GET" }).handler(csvTemplate_createServerFn_handler, async () => templateCsv());
//#endregion
export { commitUpload_createServerFn_handler, csvTemplate_createServerFn_handler, getDashboard_createServerFn_handler, loadFixture_createServerFn_handler, templateCsv as n, previewUpload_createServerFn_handler, refreshSources_createServerFn_handler, previewImport as t };
