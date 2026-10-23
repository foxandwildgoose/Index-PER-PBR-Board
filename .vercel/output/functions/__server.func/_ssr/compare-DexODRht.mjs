//#region node_modules/.nitro/vite/services/ssr/assets/compare-DexODRht.js
var CALCULATION_VERSION = "calc-2026.10.1";
var REQUESTED_CUTOFF = "2026-10-23T23:59:59+09:00";
var HISTORY_START = "2000-01";
var INDICES = [
	{
		id: "SP500",
		displayName: "S&P 500",
		officialName: "S&P 500",
		role: "primary",
		timezone: "America/New_York",
		calendarId: "XNYS",
		currency: "USD",
		symbols: { index: "SPX" },
		documentationUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
		notes: "지수 자체입니다. SPY ETF 밸류에이션으로 대체하지 않습니다."
	},
	{
		id: "NASDAQ_COMPOSITE",
		displayName: "나스닥 종합지수",
		officialName: "Nasdaq Composite",
		role: "primary",
		timezone: "America/New_York",
		calendarId: "XNAS",
		currency: "USD",
		symbols: {
			index: "COMP",
			vendorAlt: "IXIC"
		},
		documentationUrl: "https://indexes.nasdaqomx.com/Index/Overview/COMP",
		notes: "나스닥 100(NDX)도, 거래소 운영사 주식(NDAQ)도 아닙니다."
	},
	{
		id: "KOSPI",
		displayName: "코스피",
		officialName: "KOSPI",
		role: "primary",
		timezone: "Asia/Seoul",
		calendarId: "XKRX",
		currency: "KRW",
		symbols: { index: "KOSPI" },
		documentationUrl: "https://data.krx.co.kr/",
		notes: "거래소가 발표한 지수 레벨 투자지표만 사용합니다. 오늘 구성종목으로 2000년을 재구성하지 않습니다."
	},
	{
		id: "KOSDAQ",
		displayName: "코스닥",
		officialName: "KOSDAQ",
		role: "primary",
		timezone: "Asia/Seoul",
		calendarId: "XKRX",
		currency: "KRW",
		symbols: { index: "KOSDAQ" },
		documentationUrl: "https://data.krx.co.kr/",
		notes: "코스피와 다른 유니버스입니다."
	},
	{
		id: "NASDAQ100",
		displayName: "나스닥 100",
		officialName: "Nasdaq-100",
		role: "optional",
		timezone: "America/New_York",
		calendarId: "XNAS",
		currency: "USD",
		symbols: { index: "NDX" },
		documentationUrl: "https://indexes.nasdaqomx.com/Index/Overview/NDX",
		notes: "선택 비교입니다. 나스닥 종합지수를 이 지수로 바꾸지 않습니다. QQQ와 다릅니다."
	}
];
var METRICS = [
	{
		id: "PER_TTM_REPORTED",
		label: "TTM 보고이익 PER",
		family: "per",
		earningsBasis: "ttm_reported"
	},
	{
		id: "PER_TTM_OPERATING",
		label: "TTM 영업·조정이익 PER",
		family: "per",
		earningsBasis: "ttm_operating"
	},
	{
		id: "PER_FY0",
		label: "최근 회계연도 PER (FY0)",
		family: "per",
		earningsBasis: "fy0"
	},
	{
		id: "PER_NTM",
		label: "향후 12개월 컨센서스 PER (NTM)",
		family: "per",
		earningsBasis: "ntm"
	},
	{
		id: "PER_FY1",
		label: "FY1 컨센서스 PER",
		family: "per",
		earningsBasis: "fy1"
	},
	{
		id: "PER_FY2",
		label: "FY2 컨센서스 PER",
		family: "per",
		earningsBasis: "fy2"
	},
	{
		id: "PER_PROVIDER_UNVERIFIED",
		label: "제공자 보고 PER (이익 정의 미확인)",
		family: "per",
		earningsBasis: "unknown"
	},
	{
		id: "PBR_COMMON_EQUITY",
		label: "지배주주 보통주 자본 PBR",
		family: "pbr",
		earningsBasis: "not_applicable"
	},
	{
		id: "PBR_PROVIDER_UNVERIFIED",
		label: "제공자 보고 PBR (장부가 정의 미확인)",
		family: "pbr",
		earningsBasis: "unknown"
	},
	{
		id: "CAPE_SHILLER",
		label: "Shiller CAPE (별도 보조)",
		family: "cape",
		earningsBasis: "cape_10y_real"
	}
];
var AUDIT_DATE = "2026-10-23";
var PROVIDERS = [
	{
		id: "manual_upload",
		name: "사용자 승인 파일 가져오기",
		availability: "ready",
		storage: "allow",
		cache: "allow",
		privateDisplay: "allow",
		publicDisplay: "deny",
		export: "allow",
		documentationUrl: "https://data.krx.co.kr/",
		allowedHosts: [],
		notes: "공식 또는 이용 허락된 CSV만 올립니다. 셀 안의 주소는 가져오지 않습니다. 공개 재배포는 기본 거부입니다.",
		metrics: "파일에 적힌 지표만. 앱이 FY0를 TTM으로 바꾸지 않습니다.",
		history: "파일에 실제로 있는 구간만."
	},
	{
		id: "krx_openapi",
		name: "KRX Open API",
		availability: "needs_credentials",
		storage: "unknown",
		cache: "unknown",
		privateDisplay: "unknown",
		publicDisplay: "deny",
		export: "unknown",
		documentationUrl: "https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd",
		allowedHosts: [],
		notes: "2026-10-23 서비스 목록을 확인했습니다. 지수 API는 2010-01-04 이후 시세입니다. PER/PBR은 제공 항목이 아닙니다. 인증키와 API별 승인이 필요하고, 시세 구간을 밸류에이션 커버리지로 쓰지 않습니다. 호출은 구현하지 않았습니다.",
		metrics: "PER/PBR 미지원. 지수 시세만 목록에 있음.",
		history: "시세 2010-01-04 이후. 2000년 증명은 아님."
	},
	{
		id: "krx_marketplace",
		name: "KRX 데이터마켓플레이스",
		availability: "needs_credentials",
		storage: "unknown",
		cache: "unknown",
		privateDisplay: "unknown",
		publicDisplay: "deny",
		export: "unknown",
		documentationUrl: "https://data.krx.co.kr/",
		allowedHosts: [],
		notes: "투자지표 내보내기가 별도 데이터셋입니다. 로그인 벽을 우회하지 않습니다. 허락된 파일을 manual_upload로 넣습니다.",
		metrics: "화면의 현재 비율만으로는 과거 시계열이 증명되지 않습니다.",
		history: "자동 수집 없음."
	},
	{
		id: "spglobal",
		name: "S&P Dow Jones Indices",
		availability: "needs_license",
		storage: "unknown",
		cache: "unknown",
		privateDisplay: "unknown",
		publicDisplay: "deny",
		export: "unknown",
		documentationUrl: "https://www.spglobal.com/spdji/en/documents/methodologies/methodology-index-math.pdf",
		allowedHosts: [],
		notes: "지수 개요와 수학 방법론은 공개입니다. 미국 펀더멘털 데이터 패키지는 별도 상품으로 구분됩니다. 무료 과거 PER/PBR API는 확인하지 못했습니다.",
		metrics: "라이선스된 지수 레벨 지표가 필요합니다.",
		history: "미확인."
	},
	{
		id: "nasdaq_data",
		name: "Nasdaq Global Indexes Data",
		availability: "needs_license",
		storage: "unknown",
		cache: "unknown",
		privateDisplay: "unknown",
		publicDisplay: "deny",
		export: "unknown",
		documentationUrl: "https://www.nasdaq.com/products/global-indexes/data",
		allowedHosts: [],
		notes: "상품 안내 페이지입니다. 밸류에이션 필드, 시작 시점, 이용 허락은 확인되지 않았습니다. 가격 히스토리를 펀더멘털로 간주하지 않습니다.",
		metrics: "미확인.",
		history: "미확인."
	},
	{
		id: "shiller",
		name: "Shiller CAPE 공개 파일",
		availability: "ready",
		storage: "allow",
		cache: "allow",
		privateDisplay: "allow",
		publicDisplay: "unknown",
		export: "unknown",
		documentationUrl: "http://www.econ.yale.edu/~shiller/data.htm",
		allowedHosts: ["www.econ.yale.edu", "shillerdata.com"],
		notes: "저자가 공개한 월평균 가격·보간 이익·CAPE 보조 시계열입니다. 공식 S&P 500 TTM PER이 아니고, 결측 PER을 대체하지 않습니다. 이 빌드에서는 파일을 자동 수집하지 않고, 사용자가 받은 파일을 CAPE_SHILLER로 가져옵니다. 공개 재배포 권한은 확인 전 거부입니다.",
		metrics: "CAPE만. TTM/FY0/PBR 아님.",
		history: "1871년 월간. 날짜 의미는 월평균이며 일별 종가로 바꾸지 않습니다."
	},
	{
		id: "multpl",
		name: "Multpl.com",
		availability: "temporarily_unavailable",
		storage: "deny",
		cache: "deny",
		privateDisplay: "deny",
		publicDisplay: "deny",
		export: "deny",
		documentationUrl: "https://www.multpl.com/s-p-500-pe-ratio/table/by-year",
		allowedHosts: [],
		notes: "집계 페이지가 있고 PBR 표의 날짜 관례는 PER 표와 다릅니다. 이용 허락이 확인되지 않아 수집·저장·표시를 하지 않습니다.",
		metrics: "사용 안 함.",
		history: "사용 안 함."
	},
	{
		id: "fixture",
		name: "연습 표본",
		availability: "ready",
		storage: "allow",
		cache: "allow",
		privateDisplay: "allow",
		publicDisplay: "deny",
		export: "allow",
		documentationUrl: "",
		allowedHosts: [],
		notes: "결정적 합성 숫자입니다. 시장 데이터가 아니며 라이브 주장에 쓸 수 없습니다. 운영 데이터와 섞지 않습니다.",
		metrics: "엔진 검증용.",
		history: "2000-01 이후 합성 월."
	}
];
INDICES.filter((i) => i.role === "primary").map((i) => i.id);
function metricById(id) {
	return METRICS.find((m) => m.id === id);
}
function providerById(id) {
	return PROVIDERS.find((p) => p.id === id);
}
var ALLOWED_INDEX_IDS = new Set(INDICES.map((i) => i.id));
var ALLOWED_METRIC_IDS = new Set(METRICS.map((m) => m.id));
var CRISIS_WINDOWS = [{
	start: "2008-09",
	end: "2009-06",
	label: "2008–09 금융위기"
}, {
	start: "2020-02",
	end: "2020-04",
	label: "2020 코로나 충격"
}];
var F = 10n ** BigInt(8);
var NUMERIC = /^[+-]?(?:\d+)(?:\.(\d+))?$/;
function isDecimalString(input) {
	return NUMERIC.test(input.trim());
}
function parseDecimal(input) {
	const s = input.trim();
	if (!NUMERIC.exec(s)) throw new Error(`invalid_decimal:${input}`);
	const neg = s.startsWith("-");
	const [whole, frac = ""] = s.replace(/^[+-]/, "").split(".");
	const head = (frac + "0".repeat(8)).slice(0, 8);
	const extra = frac.slice(8);
	let v = BigInt(whole) * F + BigInt(head || "0");
	if (extra.length > 0 && extra[0] >= "5") v += 1n;
	return neg ? -v : v;
}
function formatDecimal(value) {
	const neg = value < 0n;
	const abs = neg ? -value : value;
	const whole = abs / F;
	let frac = (abs % F).toString().padStart(8, "0");
	frac = frac.replace(/0+$/, "");
	const body = frac.length > 0 ? `${whole}.${frac}` : whole.toString();
	return neg ? `-${body}` : body;
}
function divRound(n, d) {
	if (d === 0n) throw new Error("division_by_zero");
	if (d < 0n) return divRound(-n, -d);
	const neg = n < 0n;
	const an = neg ? -n : n;
	const q = an / d;
	const out = an % d * 2n >= d ? q + 1n : q;
	return neg ? -out : out;
}
function decAdd(a, b) {
	return a + b;
}
function decSub(a, b) {
	return a - b;
}
function decMul(a, b) {
	return divRound(a * b, F);
}
function decDiv(a, b) {
	if (b === 0n) throw new Error("division_by_zero");
	return divRound(a * F, b);
}
function decCmp(a, b) {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}
/** Round half away from zero to `places` decimal places for display only. */
function roundDisplay(input, places) {
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
function formatRatio(value) {
	if (value == null || value === "") return "—";
	return roundDisplay(value, 2);
}
function formatPercent(value) {
	if (value == null || value === "") return "—";
	return `${roundDisplay(value, 1)}%`;
}
function parseYmd(ymd) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) throw new Error(`invalid_date:${ymd}`);
	return {
		y: Number(match[1]),
		m: Number(match[2]),
		d: Number(match[3])
	};
}
function ymd(y, m, d) {
	return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function ymOf(ymdStr) {
	return ymdStr.slice(0, 7);
}
function monthIndex(ym) {
	const [y, m] = ym.split("-").map(Number);
	if (!y || !m || m < 1 || m > 12) throw new Error(`invalid_month:${ym}`);
	return y * 12 + (m - 1);
}
function fromMonthIndex(index) {
	const y = Math.floor(index / 12);
	const m = index % 12 + 1;
	return `${y}-${String(m).padStart(2, "0")}`;
}
function addMonths(ym, delta) {
	return fromMonthIndex(monthIndex(ym) + delta);
}
function monthBefore(ym) {
	return addMonths(ym, -1);
}
function monthsInclusive(start, end) {
	const a = monthIndex(start);
	const b = monthIndex(end);
	if (b < a) return [];
	const out = [];
	for (let i = a; i <= b; i += 1) out.push(fromMonthIndex(i));
	return out;
}
function daysInMonth(y, m) {
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function weekday(ymdStr) {
	const { y, m, d } = parseYmd(ymdStr);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function seoulDate(iso) {
	const dt = new Date(iso);
	const shifted = new Date(dt.getTime() + 324e5);
	return ymd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}
/** A calendar month is complete only once the cutoff reaches the next month. */
function lastCompletedMonth(cutoffIso) {
	return monthBefore(ymOf(seoulDate(cutoffIso)));
}
/** Date-only publication is usable in strict mode only when that date is strictly before the cutoff's Seoul date. */
function strictRevisionAllowed(rev, cutoffs) {
	if (new Date(cutoffs.knowledgeCutoff).getTime() > new Date(cutoffs.valuationCutoff).getTime()) return {
		ok: false,
		reason: "knowledge_cutoff_after_valuation"
	};
	if (rev.vintageMode !== "point_in_time") return {
		ok: false,
		reason: "publication_vintage_unknown"
	};
	if (!rev.availableAt || rev.availabilityPrecision === "unknown") return {
		ok: false,
		reason: "publication_vintage_unknown"
	};
	if (rev.availabilityPrecision === "date") {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(rev.availableAt.slice(0, 10))) return {
			ok: false,
			reason: "publication_vintage_unknown"
		};
		if (!(rev.availableAt.slice(0, 10) < seoulDate(cutoffs.valuationCutoff))) return {
			ok: false,
			reason: "publication_not_strictly_before_cutoff"
		};
		return {
			ok: true,
			reason: null
		};
	}
	if (new Date(rev.availableAt).getTime() > new Date(cutoffs.valuationCutoff).getTime()) return {
		ok: false,
		reason: "published_after_valuation_cutoff"
	};
	return {
		ok: true,
		reason: null
	};
}
function descriptiveRevisionAllowed(rev, cutoffs) {
	if (rev.sessionCloseAt) {
		if (new Date(rev.sessionCloseAt).getTime() > new Date(cutoffs.valuationCutoff).getTime()) return {
			ok: false,
			reason: "session_not_closed"
		};
	} else if (rev.observationDate > seoulDate(cutoffs.valuationCutoff)) return {
		ok: false,
		reason: "observation_after_valuation_cutoff"
	};
	if (rev.availableAt && rev.availabilityPrecision === "timestamp") {
		if (new Date(rev.availableAt).getTime() > new Date(cutoffs.knowledgeCutoff).getTime()) return {
			ok: false,
			reason: "not_yet_known"
		};
	}
	if (rev.availableAt && rev.availabilityPrecision === "date") {
		if (rev.availableAt.slice(0, 10) > seoulDate(cutoffs.knowledgeCutoff)) return {
			ok: false,
			reason: "not_yet_known"
		};
	}
	return {
		ok: true,
		reason: null
	};
}
var CROSS_FIELDS = [
	"earningsBasis",
	"lossTreatment",
	"aggregationMethod",
	"indexWeighting",
	"negativeEquityTreatment",
	"frequency",
	"dateSemantics"
];
function crossCompatible(a, b) {
	if (a.family !== b.family) return {
		ok: false,
		reason: "metric_family_differs"
	};
	if (a.family === "cape" || b.family === "cape") return {
		ok: false,
		reason: "cape_is_not_a_per_substitute"
	};
	for (const field of CROSS_FIELDS) {
		const left = a[field];
		const right = b[field];
		if (left === "unknown" || right === "unknown" || left === "" || right === "") return {
			ok: false,
			reason: `${field}_unknown`
		};
		if (left !== right) return {
			ok: false,
			reason: `${field}_differs`
		};
	}
	if (a.metricId !== b.metricId) return {
		ok: false,
		reason: "metric_id_differs"
	};
	return {
		ok: true,
		reason: null
	};
}
function discountPercent(ratioA, ratioB) {
	const a = parseDecimal(ratioA);
	const b = parseDecimal(ratioB);
	if (decCmp(a, 0n) <= 0 || decCmp(b, 0n) <= 0) return null;
	const raw = decMul(parseDecimal("100"), decSub(parseDecimal("1"), decDiv(a, b)));
	return {
		value: formatDecimal(raw),
		direction: decCmp(raw, 0n) < 0 ? "프리미엄" : "할인"
	};
}
function growthFactor(input) {
	const g = parseDecimal(input.growth);
	const one = parseDecimal("1");
	if (input.growthKind === "cumulative") return decAdd(one, g);
	let acc = one;
	const annual = decAdd(one, g);
	for (let i = 0; i < input.years; i += 1) acc = decMul(acc, annual);
	return acc;
}
/** terminal/initial = (terminal earnings / initial) * (terminal multiple / initial) - 1 */
function priceReturn(input) {
	return formatDecimal(decSub(decMul(growthFactor(input), decAdd(parseDecimal("1"), parseDecimal(input.multipleChange))), parseDecimal("1")));
}
function dividendTotal(input) {
	if (!input.dividendYieldAnnual || input.path === "none") return {
		priceReturn: input.priceReturn,
		withDividends: null,
		note: "배당을 넣지 않았습니다. 가격 수익률만 표시합니다."
	};
	const y = parseDecimal(input.dividendYieldAnnual);
	if (input.path === "cash_no_reinvestment") {
		const cash = decMul(y, parseDecimal(String(input.years)));
		return {
			priceReturn: input.priceReturn,
			withDividends: formatDecimal(decAdd(parseDecimal(input.priceReturn), cash)),
			note: "배당은 재투자 없는 누적 현금으로 가격 수익률에 더했습니다. 수수료와 세금은 없습니다."
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
		note: "배당은 매년 같은 수익률로 재투자한다고 가정했습니다. 수수료와 세금은 없습니다."
	};
}
/** (1 + USD asset return) * (ending KRW per USD / starting KRW per USD) - 1 */
function krwInvestorReturn(input) {
	const one = parseDecimal("1");
	const fx = decDiv(parseDecimal(input.endKrwPerUsd), parseDecimal(input.startKrwPerUsd));
	return formatDecimal(decSub(decMul(decAdd(one, parseDecimal(input.usdAssetReturn)), fx), one));
}
function classifyIncoming(input) {
	if (input.rollForward) return {
		isEstimate: true,
		estimateOrigin: "application",
		note: "예전 배수에 새 가격을 곱한 앱 추정치입니다. 제공자 관측을 대체하지 않습니다."
	};
	if (input.estimateOrigin === "provider" || input.declaredEstimate) return {
		isEstimate: true,
		estimateOrigin: "provider",
		note: "제공자가 추정치로 표시한 값입니다."
	};
	return {
		isEstimate: false,
		estimateOrigin: "none",
		note: "제공자가 발표한 비율입니다. 재무 기간이 가격일보다 앞선다는 사실만으로 추정치가 되지 않습니다."
	};
}
function classifyDenominator(input) {
	if (input.zeroIsSentinel && input.value != null && decCmp(parseDecimal(input.value), 0n) === 0) return {
		value: null,
		status: "missing",
		reason: "vendor_zero_sentinel"
	};
	if (input.denominatorStatus === "zero" || input.denominatorStatus === "negative") return {
		value: input.value,
		status: "not_meaningful",
		reason: "nonpositive_denominator"
	};
	if (input.value == null) return {
		value: null,
		status: "missing",
		reason: input.value === null ? "missing_value" : null
	};
	return {
		value: input.value,
		status: "valid",
		reason: null
	};
}
//#endregion
export { monthIndex as A, ymd as B, formatRatio as C, lastCompletedMonth as D, krwInvestorReturn as E, providerById as F, seoulDate as I, strictRevisionAllowed as L, parseDecimal as M, parseYmd as N, metricById as O, priceReturn as P, weekday as R, formatPercent as S, isDecimalString as T, decDiv as _, CRISIS_WINDOWS as a, dividendTotal as b, METRICS as c, classifyDenominator as d, classifyIncoming as f, decCmp as g, decAdd as h, CALCULATION_VERSION as i, monthsInclusive as j, monthBefore as k, PROVIDERS as l, daysInMonth as m, ALLOWED_METRIC_IDS as n, HISTORY_START as o, crossCompatible as p, AUDIT_DATE as r, INDICES as s, ALLOWED_INDEX_IDS as t, REQUESTED_CUTOFF as u, descriptiveRevisionAllowed as v, fromMonthIndex as w, formatDecimal as x, discountPercent as y, ymOf as z };
