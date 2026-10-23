import { ALLOWED_INDEX_IDS, ALLOWED_METRIC_IDS, metricById, providerById } from "./registry.ts";
import { classifyDenominator, classifyIncoming } from "./compare.ts";
import { isDecimalString } from "./decimal.ts";

const MAX_CHARS = 1_500_000;
const MAX_ROWS = 20_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORMULA = /^[=+@\t\r]/;

export interface ImportRow {
  indexId: string;
  metricId: string;
  observationDate: string;
  value: string | null;
  status: "valid" | "missing" | "not_meaningful";
  reasonCode: string | null;
  priceAsOf: string | null;
  financialPeriodEnd: string | null;
  availableAt: string | null;
  availabilityPrecision: "timestamp" | "date" | "unknown";
  isEstimate: boolean;
  estimateOrigin: "provider" | "application" | "scenario" | "none";
  denominatorStatus: "positive" | "zero" | "negative" | "unknown";
  denominatorEvidence: "source_explicit" | "verified_reconstruction" | "unknown";
  sourceUrl: string;
  methodologyVersion: string;
  vintageMode: "point_in_time" | "current_vintage" | "unknown";
  frequency: "daily_close" | "monthly_close" | "monthly_average" | "quarterly" | "annual";
  dateSemantics: string;
  earningsBasis: string;
  providerId: string;
  sessionCloseAt: string | null;
  lossTreatment: string;
  aggregationMethod: string;
  indexWeighting: string;
  negativeEquityTreatment: string;
  zeroIsSentinel: boolean;
}

export interface RejectedRow {
  line: number;
  reason: string;
  raw: string;
}

export interface ImportPreview {
  ok: boolean;
  inserts: ImportRow[];
  rejected: RejectedRow[];
  fetchedHosts: string[];
  warnings: string[];
}

const HEADER = [
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
  "zero_is_sentinel",
] as const;

export function templateCsv(): string {
  const header = HEADER.join(",");
  const sample = [
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
    "no",
  ].join(",");
  return `${header}\n${sample}\n`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quote = false;
      } else cell += ch;
    } else if (ch === '"') quote = true;
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

function formula(value: string): boolean {
  return FORMULA.test(value);
}

export function previewImport(text: string): ImportPreview {
  const warnings: string[] = [];
  if (text.length > MAX_CHARS) {
    return { ok: false, inserts: [], rejected: [{ line: 0, reason: "file_too_large", raw: "" }], fetchedHosts: [], warnings };
  }
  if (text.includes("\u0000")) {
    return { ok: false, inserts: [], rejected: [{ line: 0, reason: "binary_rejected", raw: "" }], fetchedHosts: [], warnings };
  }
  const table = parseCsv(text);
  if (table.length === 0) {
    return { ok: false, inserts: [], rejected: [{ line: 1, reason: "empty", raw: "" }], fetchedHosts: [], warnings };
  }
  const header = table[0]!.map((h) => h.trim());
  const missing = ["index_id", "metric_id", "observation_date", "source_url"].filter((k) => !header.includes(k));
  if (missing.length > 0) {
    return {
      ok: false,
      inserts: [],
      rejected: [{ line: 1, reason: `missing_columns:${missing.join("|")}`, raw: header.join(",") }],
      fetchedHosts: [],
      warnings,
    };
  }
  const idx = (name: string) => header.indexOf(name);
  const inserts: ImportRow[] = [];
  const rejected: RejectedRow[] = [];
  const body = table.slice(1);
  if (body.length > MAX_ROWS) {
    return { ok: false, inserts: [], rejected: [{ line: 0, reason: "too_many_rows", raw: "" }], fetchedHosts: [], warnings };
  }
  body.forEach((cols, i) => {
    const line = i + 2;
    const get = (name: string) => (idx(name) >= 0 ? (cols[idx(name)] ?? "").trim() : "");
    const raw = cols.join(",");
    const textFields = header
      .map((name, n) => ({ name, value: (cols[n] ?? "").trim() }))
      .filter((f) => f.name !== "value" && f.value !== "");
    if (textFields.some((f) => formula(f.value))) {
      rejected.push({ line, reason: "formula_injection", raw });
      return;
    }
    const indexId = get("index_id");
    const metricId = get("metric_id");
    const observationDate = get("observation_date");
    if (!ALLOWED_INDEX_IDS.has(indexId)) {
      rejected.push({ line, reason: "unknown_index", raw });
      return;
    }
    if (!ALLOWED_METRIC_IDS.has(metricId)) {
      rejected.push({ line, reason: "unknown_metric", raw });
      return;
    }
    if (!DATE.test(observationDate)) {
      rejected.push({ line, reason: "ambiguous_or_invalid_date", raw });
      return;
    }
    for (const name of ["price_as_of", "financial_period_end"]) {
      const v = get(name);
      if (v && !DATE.test(v)) {
        rejected.push({ line, reason: "ambiguous_or_invalid_date", raw });
        return;
      }
    }
    const sourceUrl = get("source_url");
    if (!sourceUrl || formula(sourceUrl)) {
      rejected.push({ line, reason: "source_url_required", raw });
      return;
    }
    const valueRaw = get("value");
    if (valueRaw && !isDecimalString(valueRaw)) {
      rejected.push({ line, reason: "invalid_number", raw });
      return;
    }
    const metric = metricById(metricId)!;
    const providerId = get("provider_id") || "manual_upload";
    if (!providerById(providerId) || providerId === "fixture") {
      rejected.push({ line, reason: "unknown_provider", raw });
      return;
    }
    const precision = get("availability_precision") || "unknown";
    if (!["timestamp", "date", "unknown"].includes(precision)) {
      rejected.push({ line, reason: "bad_precision", raw });
      return;
    }
    const frequency = get("frequency") || "monthly_close";
    if (!["daily_close", "monthly_close", "monthly_average", "quarterly", "annual"].includes(frequency)) {
      rejected.push({ line, reason: "bad_frequency", raw });
      return;
    }
    const originIn = get("estimate_origin") || "none";
    const classified = classifyIncoming({
      declaredEstimate: get("is_estimate") === "true" || get("is_estimate") === "yes",
      estimateOrigin: (["provider", "application", "scenario", "none"].includes(originIn)
        ? originIn
        : "none") as "none",
      rollForward: get("reason_code") === "price_roll_forward",
    });
    const denom = get("denominator_status") || "unknown";
    if (!["positive", "zero", "negative", "unknown"].includes(denom)) {
      rejected.push({ line, reason: "bad_denominator", raw });
      return;
    }
    const cleaned = classifyDenominator({
      value: valueRaw || null,
      denominatorStatus: denom as "unknown",
      zeroIsSentinel: get("zero_is_sentinel") === "yes" || get("zero_is_sentinel") === "true",
    });
    const statusIn = get("status");
    let status = cleaned.status;
    if (statusIn === "not_meaningful") status = "not_meaningful";
    if (statusIn === "missing") status = "missing";
    if (statusIn && !["valid", "missing", "not_meaningful", ""].includes(statusIn)) {
      rejected.push({ line, reason: "bad_status", raw });
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
      availabilityPrecision: precision as "unknown",
      isEstimate: classified.isEstimate,
      estimateOrigin: classified.estimateOrigin,
      denominatorStatus: denom as "unknown",
      denominatorEvidence: (get("denominator_evidence") || "unknown") as "unknown",
      sourceUrl,
      methodologyVersion: get("methodology_version") || "unspecified",
      vintageMode: (get("vintage_mode") || "unknown") as "unknown",
      frequency: frequency as "monthly_close",
      dateSemantics: get("date_semantics") || "unspecified",
      earningsBasis,
      providerId,
      sessionCloseAt: get("session_close_at") || null,
      lossTreatment: get("loss_treatment") || "unknown",
      aggregationMethod: get("aggregation_method") || "unknown",
      indexWeighting: get("index_weighting") || "unknown",
      negativeEquityTreatment: get("negative_equity_treatment") || "unknown",
      zeroIsSentinel: get("zero_is_sentinel") === "yes",
    });
  });
  if (inserts.some((r) => r.earningsBasis === "unknown" || r.metricId.includes("UNVERIFIED"))) {
    warnings.push("정의가 미확인인 행은 표시할 수 있지만 합격 역사 구간이나 교차 비교에는 쓰이지 않습니다.");
  }
  return { ok: rejected.length === 0, inserts, rejected, fetchedHosts: [], warnings };
}

export function assertAllowedHost(url: string, allow: readonly string[]): boolean {
  let host = "";
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol !== "https:" && parsed.hostname !== "www.econ.yale.edu") return false;
    host = parsed.hostname;
  } catch {
    return false;
  }
  return allow.includes(host);
}
