import { decAdd, decCmp, decDiv, decMul, decSub, formatDecimal, parseDecimal } from "./decimal.ts";
import { seoulDate } from "./months.ts";

export type VintageMode = "STRICT_AS_KNOWN" | "CURRENT_VINTAGE_DESCRIPTIVE";
export type MatchingRule = "exact_observation_date" | "same_calendar_month_final_local_session";

export interface VintageFields {
  availableAt: string | null;
  availabilityPrecision: "timestamp" | "date" | "unknown";
  vintageMode: "point_in_time" | "current_vintage" | "unknown";
  observationDate: string;
  sessionCloseAt: string | null;
}

export interface Cutoffs {
  valuationCutoff: string;
  knowledgeCutoff: string;
}

/** Date-only publication is usable in strict mode only when that date is strictly before the cutoff's Seoul date. */
export function strictRevisionAllowed(rev: VintageFields, cutoffs: Cutoffs): { ok: boolean; reason: string | null } {
  if (new Date(cutoffs.knowledgeCutoff).getTime() > new Date(cutoffs.valuationCutoff).getTime()) {
    return { ok: false, reason: "knowledge_cutoff_after_valuation" };
  }
  if (rev.vintageMode !== "point_in_time") return { ok: false, reason: "publication_vintage_unknown" };
  if (!rev.availableAt || rev.availabilityPrecision === "unknown") {
    return { ok: false, reason: "publication_vintage_unknown" };
  }
  if (rev.availabilityPrecision === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rev.availableAt.slice(0, 10))) {
      return { ok: false, reason: "publication_vintage_unknown" };
    }
    if (!(rev.availableAt.slice(0, 10) < seoulDate(cutoffs.valuationCutoff))) {
      return { ok: false, reason: "publication_not_strictly_before_cutoff" };
    }
    return { ok: true, reason: null };
  }
  if (new Date(rev.availableAt).getTime() > new Date(cutoffs.valuationCutoff).getTime()) {
    return { ok: false, reason: "published_after_valuation_cutoff" };
  }
  return { ok: true, reason: null };
}

export function descriptiveRevisionAllowed(rev: VintageFields, cutoffs: Cutoffs): { ok: boolean; reason: string | null } {
  if (rev.sessionCloseAt) {
    if (new Date(rev.sessionCloseAt).getTime() > new Date(cutoffs.valuationCutoff).getTime()) {
      return { ok: false, reason: "session_not_closed" };
    }
  } else if (rev.observationDate > seoulDate(cutoffs.valuationCutoff)) {
    return { ok: false, reason: "observation_after_valuation_cutoff" };
  }
  if (rev.availableAt && rev.availabilityPrecision === "timestamp") {
    if (new Date(rev.availableAt).getTime() > new Date(cutoffs.knowledgeCutoff).getTime()) {
      return { ok: false, reason: "not_yet_known" };
    }
  }
  if (rev.availableAt && rev.availabilityPrecision === "date") {
    if (rev.availableAt.slice(0, 10) > seoulDate(cutoffs.knowledgeCutoff)) {
      return { ok: false, reason: "not_yet_known" };
    }
  }
  return { ok: true, reason: null };
}

export interface DefinitionFields {
  metricId: string;
  family: "per" | "pbr" | "cape";
  earningsBasis: string;
  lossTreatment: string;
  aggregationMethod: string;
  indexWeighting: string;
  negativeEquityTreatment: string;
  frequency: string;
  dateSemantics: string;
}

const CROSS_FIELDS = [
  "earningsBasis",
  "lossTreatment",
  "aggregationMethod",
  "indexWeighting",
  "negativeEquityTreatment",
  "frequency",
  "dateSemantics",
] as const;

export function crossCompatible(a: DefinitionFields, b: DefinitionFields): { ok: boolean; reason: string | null } {
  if (a.family !== b.family) return { ok: false, reason: "metric_family_differs" };
  if (a.family === "cape" || b.family === "cape") return { ok: false, reason: "cape_is_not_a_per_substitute" };
  for (const field of CROSS_FIELDS) {
    const left = a[field];
    const right = b[field];
    if (left === "unknown" || right === "unknown" || left === "" || right === "") {
      return { ok: false, reason: `${field}_unknown` };
    }
    if (left !== right) return { ok: false, reason: `${field}_differs` };
  }
  if (a.metricId !== b.metricId) return { ok: false, reason: "metric_id_differs" };
  return { ok: true, reason: null };
}

export function withinSeriesComparable(input: {
  methodologyBreak: boolean;
  definitionsKnown: boolean;
}): { ok: boolean; reason: string | null } {
  if (!input.definitionsKnown) return { ok: false, reason: "definition_unknown" };
  if (input.methodologyBreak) return { ok: false, reason: "methodology_break" };
  return { ok: true, reason: null };
}

export function datesMatch(rule: MatchingRule, a: string, b: string): boolean {
  if (rule === "exact_observation_date") return a === b;
  return a.slice(0, 7) === b.slice(0, 7);
}

export function discountPercent(ratioA: string, ratioB: string): { value: string; direction: "할인" | "프리미엄" } | null {
  const a = parseDecimal(ratioA);
  const b = parseDecimal(ratioB);
  if (decCmp(a, 0n) <= 0 || decCmp(b, 0n) <= 0) return null;
  const raw = decMul(parseDecimal("100"), decSub(parseDecimal("1"), decDiv(a, b)));
  const value = formatDecimal(raw);
  return { value, direction: decCmp(raw, 0n) < 0 ? "프리미엄" : "할인" };
}

export interface ScenarioInput {
  growth: string;
  growthKind: "cumulative" | "annualized";
  years: number;
  multipleChange: string;
}

export function growthFactor(input: Pick<ScenarioInput, "growth" | "growthKind" | "years">): bigint {
  const g = parseDecimal(input.growth);
  const one = parseDecimal("1");
  if (input.growthKind === "cumulative") return decAdd(one, g);
  let acc = one;
  const annual = decAdd(one, g);
  for (let i = 0; i < input.years; i += 1) acc = decMul(acc, annual);
  return acc;
}

/** terminal/initial = (terminal earnings / initial) * (terminal multiple / initial) - 1 */
export function priceReturn(input: ScenarioInput): string {
  const earnings = growthFactor(input);
  const multiple = decAdd(parseDecimal("1"), parseDecimal(input.multipleChange));
  const ratio = decMul(earnings, multiple);
  return formatDecimal(decSub(ratio, parseDecimal("1")));
}

export function dividendTotal(input: {
  priceReturn: string;
  dividendYieldAnnual: string | null;
  years: number;
  path: "none" | "cash_no_reinvestment" | "reinvested";
}): { priceReturn: string; withDividends: string | null; note: string } {
  if (!input.dividendYieldAnnual || input.path === "none") {
    return { priceReturn: input.priceReturn, withDividends: null, note: "배당을 넣지 않았습니다. 가격 수익률만 표시합니다." };
  }
  const y = parseDecimal(input.dividendYieldAnnual);
  if (input.path === "cash_no_reinvestment") {
    const cash = decMul(y, parseDecimal(String(input.years)));
    return {
      priceReturn: input.priceReturn,
      withDividends: formatDecimal(decAdd(parseDecimal(input.priceReturn), cash)),
      note: "배당은 재투자 없는 누적 현금으로 가격 수익률에 더했습니다. 수수료와 세금은 없습니다.",
    };
  }
  const one = parseDecimal("1");
  let divFactor = one;
  const annual = decAdd(one, y);
  for (let i = 0; i < input.years; i += 1) divFactor = decMul(divFactor, annual);
  const total = decSub(decMul(decAdd(one, parseDecimal(input.priceReturn)), divFactor), one);
  return {
    priceReturn: input.priceReturn,
    withDividends: formatDecimal(total),
    note: "배당은 매년 같은 수익률로 재투자한다고 가정했습니다. 수수료와 세금은 없습니다.",
  };
}

/** (1 + USD asset return) * (ending KRW per USD / starting KRW per USD) - 1 */
export function krwInvestorReturn(input: {
  usdAssetReturn: string;
  startKrwPerUsd: string;
  endKrwPerUsd: string;
}): string {
  const one = parseDecimal("1");
  const fx = decDiv(parseDecimal(input.endKrwPerUsd), parseDecimal(input.startKrwPerUsd));
  return formatDecimal(decSub(decMul(decAdd(one, parseDecimal(input.usdAssetReturn)), fx), one));
}

export function classifyIncoming(input: {
  declaredEstimate: boolean;
  estimateOrigin: "provider" | "application" | "scenario" | "none";
  rollForward: boolean;
}): { isEstimate: boolean; estimateOrigin: "provider" | "application" | "scenario" | "none"; note: string } {
  if (input.rollForward) {
    return {
      isEstimate: true,
      estimateOrigin: "application",
      note: "예전 배수에 새 가격을 곱한 앱 추정치입니다. 제공자 관측을 대체하지 않습니다.",
    };
  }
  if (input.estimateOrigin === "provider" || input.declaredEstimate) {
    return { isEstimate: true, estimateOrigin: "provider", note: "제공자가 추정치로 표시한 값입니다." };
  }
  return {
    isEstimate: false,
    estimateOrigin: "none",
    note: "제공자가 발표한 비율입니다. 재무 기간이 가격일보다 앞선다는 사실만으로 추정치가 되지 않습니다.",
  };
}

export function classifyDenominator(input: {
  value: string | null;
  denominatorStatus: "positive" | "zero" | "negative" | "unknown";
  zeroIsSentinel: boolean;
}): { value: string | null; status: "valid" | "missing" | "not_meaningful"; reason: string | null } {
  if (input.zeroIsSentinel && input.value != null && decCmp(parseDecimal(input.value), 0n) === 0) {
    return { value: null, status: "missing", reason: "vendor_zero_sentinel" };
  }
  if (input.denominatorStatus === "zero" || input.denominatorStatus === "negative") {
    return { value: input.value, status: "not_meaningful", reason: "nonpositive_denominator" };
  }
  if (input.value == null) return { value: null, status: "missing", reason: input.value === null ? "missing_value" : null };
  return { value: input.value, status: "valid", reason: null };
}
