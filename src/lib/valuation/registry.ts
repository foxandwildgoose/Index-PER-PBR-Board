export type ProviderAvailability =
  | "ready"
  | "needs_credentials"
  | "needs_license"
  | "unsupported_metric"
  | "temporarily_unavailable";

export type DatasetKind = "live" | "imported" | "fixture";

export interface IndexDef {
  id: string;
  displayName: string;
  officialName: string;
  role: "primary" | "optional";
  timezone: string;
  calendarId: "XNYS" | "XNAS" | "XKRX";
  currency: "USD" | "KRW";
  symbols: Record<string, string>;
  documentationUrl: string;
  notes: string;
}

export interface MetricDef {
  id: string;
  label: string;
  family: "per" | "pbr" | "cape";
  earningsBasis: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  availability: ProviderAvailability;
  storage: "allow" | "deny" | "unknown";
  cache: "allow" | "deny" | "unknown";
  privateDisplay: "allow" | "deny" | "unknown";
  publicDisplay: "allow" | "deny" | "unknown";
  export: "allow" | "deny" | "unknown";
  documentationUrl: string;
  allowedHosts: string[];
  notes: string;
  metrics: string;
  history: string;
}

export const CALCULATION_VERSION = "calc-2026.10.1";
export const REQUESTED_FIXED_DATE = "2026-10-23";
export const REQUESTED_CUTOFF = "2026-10-23T23:59:59+09:00";
export const HISTORY_START = "2000-01";

export const INDICES: IndexDef[] = [
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
    notes: "지수 자체입니다. SPY ETF 밸류에이션으로 대체하지 않습니다.",
  },
  {
    id: "NASDAQ_COMPOSITE",
    displayName: "나스닥 종합지수",
    officialName: "Nasdaq Composite",
    role: "primary",
    timezone: "America/New_York",
    calendarId: "XNAS",
    currency: "USD",
    symbols: { index: "COMP", vendorAlt: "IXIC" },
    documentationUrl: "https://indexes.nasdaqomx.com/Index/Overview/COMP",
    notes: "나스닥 100(NDX)도, 거래소 운영사 주식(NDAQ)도 아닙니다.",
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
    notes: "거래소가 발표한 지수 레벨 투자지표만 사용합니다. 오늘 구성종목으로 2000년을 재구성하지 않습니다.",
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
    notes: "코스피와 다른 유니버스입니다.",
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
    notes: "선택 비교입니다. 나스닥 종합지수를 이 지수로 바꾸지 않습니다. QQQ와 다릅니다.",
  },
];

export const METRICS: MetricDef[] = [
  { id: "PER_TTM_REPORTED", label: "TTM 보고이익 PER", family: "per", earningsBasis: "ttm_reported" },
  { id: "PER_TTM_OPERATING", label: "TTM 영업·조정이익 PER", family: "per", earningsBasis: "ttm_operating" },
  { id: "PER_FY0", label: "최근 회계연도 PER (FY0)", family: "per", earningsBasis: "fy0" },
  { id: "PER_NTM", label: "향후 12개월 컨센서스 PER (NTM)", family: "per", earningsBasis: "ntm" },
  { id: "PER_FY1", label: "FY1 컨센서스 PER", family: "per", earningsBasis: "fy1" },
  { id: "PER_FY2", label: "FY2 컨센서스 PER", family: "per", earningsBasis: "fy2" },
  { id: "PER_PROVIDER_UNVERIFIED", label: "제공자 보고 PER (이익 정의 미확인)", family: "per", earningsBasis: "unknown" },
  { id: "PBR_COMMON_EQUITY", label: "지배주주 보통주 자본 PBR", family: "pbr", earningsBasis: "not_applicable" },
  { id: "PBR_PROVIDER_UNVERIFIED", label: "제공자 보고 PBR (장부가 정의 미확인)", family: "pbr", earningsBasis: "unknown" },
  { id: "CAPE_SHILLER", label: "Shiller CAPE (별도 보조)", family: "cape", earningsBasis: "cape_10y_real" },
];

export const AUDIT_DATE = "2026-10-23";

export const PROVIDERS: ProviderDef[] = [
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
    history: "파일에 실제로 있는 구간만.",
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
    notes:
      "2026-10-23 서비스 목록을 확인했습니다. 지수 API는 2010-01-04 이후 시세입니다. PER/PBR은 제공 항목이 아닙니다. 인증키와 API별 승인이 필요하고, 시세 구간을 밸류에이션 커버리지로 쓰지 않습니다. 호출은 구현하지 않았습니다.",
    metrics: "PER/PBR 미지원. 지수 시세만 목록에 있음.",
    history: "시세 2010-01-04 이후. 2000년 증명은 아님.",
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
    history: "자동 수집 없음.",
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
    notes:
      "지수 개요와 수학 방법론은 공개입니다. 미국 펀더멘털 데이터 패키지는 별도 상품으로 구분됩니다. 무료 과거 PER/PBR API는 확인하지 못했습니다.",
    metrics: "라이선스된 지수 레벨 지표가 필요합니다.",
    history: "미확인.",
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
    history: "미확인.",
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
    notes:
      "저자가 공개한 월평균 가격·보간 이익·CAPE 보조 시계열입니다. 공식 S&P 500 TTM PER이 아니고, 결측 PER을 대체하지 않습니다. 이 빌드에서는 파일을 자동 수집하지 않고, 사용자가 받은 파일을 CAPE_SHILLER로 가져옵니다. 공개 재배포 권한은 확인 전 거부입니다.",
    metrics: "CAPE만. TTM/FY0/PBR 아님.",
    history: "1871년 월간. 날짜 의미는 월평균이며 일별 종가로 바꾸지 않습니다.",
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
    history: "사용 안 함.",
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
    history: "2000-01 이후 합성 월.",
  },
];

export const PRIMARY_INDEX_IDS = INDICES.filter((i) => i.role === "primary").map((i) => i.id);

export function indexById(id: string): IndexDef | undefined {
  return INDICES.find((i) => i.id === id);
}
export function metricById(id: string): MetricDef | undefined {
  return METRICS.find((m) => m.id === id);
}
export function providerById(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export const ALLOWED_INDEX_IDS = new Set(INDICES.map((i) => i.id));
export const ALLOWED_METRIC_IDS = new Set(METRICS.map((m) => m.id));

export const CRISIS_WINDOWS = [
  { start: "2008-09", end: "2009-06", label: "2008–09 금융위기" },
  { start: "2020-02", end: "2020-04", label: "2020 코로나 충격" },
];
