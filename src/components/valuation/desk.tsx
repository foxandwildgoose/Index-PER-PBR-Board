import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { commitUpload, csvTemplate, getDashboard, loadFixture, previewUpload, refreshSources } from "@/lib/valuation/api";
import { dividendTotal, krwInvestorReturn, priceReturn } from "@/lib/valuation/compare";
import { formatPercent, formatRatio } from "@/lib/valuation/decimal";
import { FIXTURE_FORMULA } from "@/lib/valuation/fixture";
import { METRICS } from "@/lib/valuation/registry";
import type { Snapshot } from "@/lib/valuation/snapshot";

type Payload = Awaited<ReturnType<typeof getDashboard>>;

const TABS = [
  { id: "overview", label: "개요" },
  { id: "history", label: "추이" },
  { id: "annual", label: "연간 비교" },
  { id: "relative", label: "상대 비교" },
  { id: "scenario", label: "시나리오" },
  { id: "method", label: "자료·방법론" },
  { id: "import", label: "가져오기" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const REASON: Record<string, string> = {
  year_to_date_not_year_end: "연중 · 연말 아님",
  no_december_year_end: "12월 말 없음",
  not_meaningful: "의미 없음",
  no_numeric_months: "자료 없음",
  "자료 없음": "자료 없음",
};

export function Desk() {
  const [tab, setTab] = useState<TabId>("overview");
  const [mode, setMode] = useState<"fixed" | "live">("fixed");
  const [vintage, setVintage] = useState<"STRICT_AS_KNOWN" | "CURRENT_VINTAGE_DESCRIPTIVE">("CURRENT_VINTAGE_DESCRIPTIVE");
  const [dataset, setDataset] = useState<"imported" | "fixture">("imported");
  const [annualMode, setAnnualMode] = useState<"year_end" | "annual_mean">("year_end");
  const [historyWindow, setHistoryWindow] = useState<"since_2000" | "trailing_10y" | "trailing_5y">("since_2000");
  const [perMetricId, setPerMetricId] = useState("PER_TTM_REPORTED");
  const [pbrMetricId, setPbrMetricId] = useState("PBR_COMMON_EQUITY");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [chartIndex, setChartIndex] = useState("SP500");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getDashboard({
      data: { mode, vintage, dataset, annualMode, historyWindow, perMetricId, pbrMetricId },
    })
      .then((next) => {
        if (!cancel) {
          setPayload(next);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [mode, vintage, dataset, annualMode, historyWindow, perMetricId, pbrMetricId, nonce]);

  const snapshot = payload?.snapshot;
  const hasNumbers = snapshot?.cards.some((c) => c.per.value || c.pbr.value) ?? false;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-col gap-3 border-b border-line pb-5">
        <p className="text-sm font-medium text-accent">개인 리서치 · 매수·매도 신호가 아닙니다</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl text-ink sm:text-4xl">지수 밸류에이션 이력</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              S&P 500, 나스닥 종합, 코스피, 코스닥의 PER·PBR이 2000년 이후 분포에서 어디쯤인지 봅니다. 정의가 다르면 한 칸에 섞지 않습니다.
            </p>
          </div>
        </div>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="기준">
          <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as "fixed" | "live")}>
            <option value="fixed">고정 기준일 2026-10-23</option>
            <option value="live">지금 시각</option>
          </select>
        </Field>
        <Field label="빈티지">
          <select className={selectCls} value={vintage} onChange={(e) => setVintage(e.target.value as typeof vintage)}>
            <option value="CURRENT_VINTAGE_DESCRIPTIVE">현재 빈티지 서술</option>
            <option value="STRICT_AS_KNOWN">엄격 시점</option>
          </select>
        </Field>
        <Field label="자료">
          <select
            className={selectCls}
            value={dataset}
            onChange={(e) => {
              const next = e.target.value as "imported" | "fixture";
              if (next === "fixture") {
                loadFixture({ data: {} }).then(() => setDataset("fixture"));
              } else setDataset("imported");
            }}
          >
            <option value="imported">가져온 자료</option>
            <option value="fixture">연습 표본</option>
          </select>
        </Field>
        <Field label="분포 창">
          <select className={selectCls} value={historyWindow} onChange={(e) => setHistoryWindow(e.target.value as typeof historyWindow)}>
            <option value="since_2000">2000년 이후</option>
            <option value="trailing_10y">최근 10년</option>
            <option value="trailing_5y">최근 5년</option>
          </select>
        </Field>
      </section>

      {snapshot?.fixture ? (
        <p className="mb-4 rounded-lg border border-caution bg-caution-bg px-3 py-2 text-sm text-caution">
          연습 표본입니다. 시장 데이터가 아닙니다. {FIXTURE_FORMULA}
        </p>
      ) : null}
      {snapshot?.strictBlocked ? (
        <p className="mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
          공표 시점을 증명하지 못하는 행은 엄격 시점에서 빠집니다. 그때 알 수 있던 정보로 단정하지 않습니다.
        </p>
      ) : null}
      {snapshot ? <Cutoff snapshot={snapshot} /> : null}

      <div role="tablist" aria-label="화면" className="mb-4 flex gap-2 overflow-x-auto" onKeyDown={(e) => moveTab(e, tab, setTab)}>
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={
              tab === item.id
                ? "min-h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg"
                : "min-h-11 shrink-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            }
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted">자료를 읽고 있습니다.</p> : null}
      {error ? <p className="text-sm text-caution">{error}</p> : null}

      {snapshot && tab === "overview" ? (
        <Overview snapshot={snapshot} hasNumbers={hasNumbers} onFixture={() => setDataset("fixture")} onImport={() => setTab("import")} />
      ) : null}
      {snapshot && tab === "history" ? (
        <History snapshot={snapshot} indexId={chartIndex} onIndex={setChartIndex} mounted={mounted} perMetricId={perMetricId} pbrMetricId={pbrMetricId} />
      ) : null}
      {snapshot && tab === "annual" ? (
        <Annual snapshot={snapshot} annualMode={annualMode} onMode={setAnnualMode} csv={payload?.csv ?? ""} metadata={payload?.metadata ?? ""} />
      ) : null}
      {snapshot && tab === "relative" ? <Relative snapshot={snapshot} /> : null}
      {snapshot && tab === "scenario" ? <Scenario currencyNote={snapshot.cards.some((c) => c.indexId === "SP500")} /> : null}
      {snapshot && payload && tab === "method" ? <Method payload={payload} onRefresh={() => refreshSources({ data: {} }).then(() => setNonce((n) => n + 1))} /> : null}
      {tab === "import" ? (
        <ImportPanel
          perMetricId={perMetricId}
          pbrMetricId={pbrMetricId}
          onPer={setPerMetricId}
          onPbr={setPbrMetricId}
          metrics={payload?.metrics ?? METRICS}
          onLoaded={(kind) => setDataset(kind)}
        />
      ) : null}
    </main>
  );
}

const selectCls = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function moveTab(e: KeyboardEvent, tab: TabId, setTab: (id: TabId) => void) {
  const i = TABS.findIndex((t) => t.id === tab);
  if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length]!.id);
  if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length]!.id);
}

function Cutoff({ snapshot }: { snapshot: Snapshot }) {
  const kr = snapshot.sessions.filter((s) => s.indexId === "KOSPI" || s.indexId === "KOSDAQ");
  const us = snapshot.sessions.filter((s) => s.indexId === "SP500" || s.indexId === "NASDAQ_COMPOSITE");
  return (
    <section className="mb-4 grid gap-2 rounded-lg border border-line bg-surface p-3 text-sm sm:grid-cols-2">
      <p>
        <span className="text-muted">유효 컷오프 </span>
        <span className="tabular-nums">{seoul(snapshot.effectiveCutoff)}</span>
      </p>
      <p>
        <span className="text-muted">가치 / 지식 </span>
        <span className="tabular-nums">
          {seoul(snapshot.valuationCutoff)} / {seoul(snapshot.knowledgeCutoff)}
        </span>
      </p>
      <p>
        <span className="text-muted">한국 세션 </span>
        {kr.map((s) => s.session ?? "없음").join(" · ") || "없음"}
      </p>
      <p>
        <span className="text-muted">미국 세션 </span>
        {us.map((s) => `${s.indexId === "SP500" ? "S&P" : "나스닥"} ${s.session ?? "없음"}`).join(" · ")}
      </p>
      <p className="sm:col-span-2 text-muted">
        스냅샷 {snapshot.snapshotId} · {snapshot.calculationVersion} · {snapshot.vintage === "STRICT_AS_KNOWN" ? "엄격 시점" : "현재 빈티지 서술"}
      </p>
      <p className="sm:col-span-2 text-muted">{snapshot.calendarNote}</p>
    </section>
  );
}

function seoul(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function Overview({
  snapshot,
  hasNumbers,
  onFixture,
  onImport,
}: {
  snapshot: Snapshot;
  hasNumbers: boolean;
  onFixture: () => void;
  onImport: () => void;
}) {
  if (!hasNumbers) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-2xl">자료 없음</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          네 지수의 2000년 이후 PER·PBR을 확인된 무료 API로 채우지 않았습니다. KRX 오픈 API는 시세이지 투자지표가 아니고, S&P·나스닥 펀더멘털은 라이선스가 필요합니다. 빈 칸을 0으로 두거나 싼 값처럼 칠하지 않습니다.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg" onClick={onImport}>
            승인된 파일 가져오기
          </button>
          <button
            className="min-h-11 rounded-lg border border-line px-4 text-sm"
            onClick={() => {
              loadFixture({ data: {} }).then(() => onFixture());
            }}
          >
            계산 연습 표본 보기
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {snapshot.cards.map((card) => (
        <article key={card.indexId} className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-2xl">{card.displayName}</h2>
          <SlotLine title="PER" slot={card.per} />
          <SlotLine title="PBR" slot={card.pbr} />
        </article>
      ))}
    </section>
  );
}

function SlotLine({ title, slot }: { title: string; slot: Snapshot["cards"][number]["per"] }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{title}</p>
        <p className="text-2xl tabular-nums">{slot.value ? formatRatio(slot.value) : slot.statusText}</p>
      </div>
      <p className="mt-1 text-sm">{slot.metricLabel}</p>
      <p className="text-sm text-muted">
        관측 {slot.observationDate ?? "—"} · 가격 {slot.priceAsOf ?? "—"} · 재무 {slot.financialPeriodEnd ?? "—"}
      </p>
      <p className="text-sm text-muted">
        {slot.isEstimate ? `추정치 (${slot.estimateOrigin})` : "추정치 아님"} · 출처 {slot.providerId ?? "없음"} · {slot.freshness}
      </p>
      {slot.qualified && slot.positionLabel ? (
        <p className="mt-2 text-sm">
          {slot.positionLabel} · {formatPercent(slot.percentile)}
          <span className="text-muted"> 표본 {slot.sampleSize}개월, 참조 끝 {slot.referenceEnd}. 매매 지시가 아닙니다.</span>
        </p>
      ) : null}
      {slot.partial ? (
        <p className="mt-2 text-sm text-caution">
          부분 이력입니다. {slot.note || "합격 조건을 넘지 못했습니다."} 백분위 {slot.percentile ? formatPercent(slot.percentile) : "—"}는 서술일 뿐입니다.
        </p>
      ) : null}
      {slot.insufficient && slot.seriesId ? <p className="mt-2 text-sm text-muted">과거 자료 부족</p> : null}
      {!slot.seriesId ? <p className="mt-2 text-sm text-muted">{slot.note}</p> : null}
      {slot.reasons.length > 0 && slot.seriesId && !slot.qualified ? (
        <p className="mt-1 text-sm text-muted">사유 {slot.reasons.join(", ")}</p>
      ) : null}
    </div>
  );
}

function History({
  snapshot,
  indexId,
  onIndex,
  mounted,
  perMetricId,
  pbrMetricId,
}: {
  snapshot: Snapshot;
  indexId: string;
  onIndex: (id: string) => void;
  mounted: boolean;
  perMetricId: string;
  pbrMetricId: string;
}) {
  const per = snapshot.seriesViews.find((s) => s.indexId === indexId && s.metricId === perMetricId);
  const pbr = snapshot.seriesViews.find((s) => s.indexId === indexId && s.metricId === pbrMetricId);
  return (
    <section className="space-y-4">
      <Field label="지수">
        <select className={selectCls} value={indexId} onChange={(e) => onIndex(e.target.value)}>
          {snapshot.cards.map((c) => (
            <option key={c.indexId} value={c.indexId}>
              {c.displayName}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-sm text-muted">빈 달은 잇지 않습니다. 중앙값과 10·90백분위는 참조 표본입니다. 위기 음영은 읽기용 표식이지 데이터가 아닙니다.</p>
      <Chart title="PER" view={per} mounted={mounted} />
      <Chart title="PBR" view={pbr} mounted={mounted} />
    </section>
  );
}

function Chart({ title, view, mounted }: { title: string; view: Snapshot["seriesViews"][number] | undefined; mounted: boolean }) {
  if (!view) return <p className="rounded-lg border border-line bg-surface p-4 text-sm">{title} 자료 없음</p>;
  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-xl">{title}</h2>
      <p className="text-sm text-muted">
        {view.windowStart} – {view.referenceEnd}
        {view.dateSemantics === "monthly_average" ? " · 월평균이라 일별 종가가 아닙니다" : ""}
        {view.interpolated ? " · 보간 입력이 표시된 시계열" : ""}
        {view.current ? ` · 현재 관측 ${view.current.date ?? view.current.month} ${view.current.value ? formatRatio(view.current.value) : "자료 없음"}` : ""}
      </p>
      <div className="mt-3 h-64">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={view.chart}>
              <CartesianGrid stroke="#e3dcd0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6e675e" }} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: "#6e675e" }} width={42} />
              <Tooltip formatter={(value) => (value == null || value === "" ? "자료 없음" : formatRatio(String(value)))} />
              {view.bands.median ? <ReferenceLine y={Number(view.bands.median)} stroke="#1f4d3a" strokeDasharray="4 4" /> : null}
              <Line type="linear" dataKey="value" stroke="#1c1915" strokeWidth={1.6} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted">차트를 준비합니다.</p>
        )}
      </div>
      {!view.qualification.qualified ? (
        <p className="mt-2 text-sm text-caution">합격 라벨 없음. {view.qualification.reasons.join(", ") || "조건 미달"}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">이 창은 합격 조건을 통과했습니다. 그래도 매매 신호는 아닙니다.</p>
      )}
    </article>
  );
}

function Annual({
  snapshot,
  annualMode,
  onMode,
  csv,
  metadata,
}: {
  snapshot: Snapshot;
  annualMode: "year_end" | "annual_mean";
  onMode: (mode: "year_end" | "annual_mean") => void;
  csv: string;
  metadata: string;
}) {
  const metrics = [snapshot.perMetricId, snapshot.pbrMetricId];
  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <button className={annualMode === "year_end" ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm"} onClick={() => onMode("year_end")}>
          연말
        </button>
        <button className={annualMode === "annual_mean" ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm"} onClick={() => onMode("annual_mean")}>
          연간 평균
        </button>
        <button className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => download("valuation.csv", csv, "text/csv")}>
          CSV
        </button>
        <button className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => download("valuation.json", metadata, "application/json")}>
          메타데이터
        </button>
      </div>
      {snapshot.annualNotes.map((note) => (
        <p key={note} className="mb-2 text-sm text-muted">{note}</p>
      ))}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th className="p-2">연도</th>
              {snapshot.cards.map((card) =>
                metrics.map((metric) => (
                  <th key={`${card.indexId}-${metric}`} className="p-2 font-medium">
                    {card.displayName}
                    <span className="block font-normal text-muted">{metric.includes("PBR") ? "PBR" : "PER"}</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {[...snapshot.annual].reverse().map((row) => (
              <tr key={row.year} className="border-t border-line">
                <th className="p-2 text-left font-medium tabular-nums">
                  {row.year}
                  {row.label === "ytd" ? " 연중" : ""}
                </th>
                {snapshot.cards.map((card) =>
                  metrics.map((metric) => {
                    const cell = row.cells[`${card.indexId}:${metric}`];
                    return (
                      <td key={`${row.year}-${card.indexId}-${metric}`} className="p-2 tabular-nums text-ink">
                        {cell?.value ? (
                          <>
                            {formatRatio(cell.value)}
                            {annualMode === "annual_mean" && cell.count != null ? (
                              <span className="block text-muted">{cell.count}개월</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-missing">{REASON[cell?.reason ?? ""] ?? cell?.reason ?? "자료 없음"}</span>
                        )}
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Relative({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.relatives.length === 0) {
    return <p className="text-sm text-muted">같은 정의의 짝이 없습니다. 할인율은 켜지지 않습니다.</p>;
  }
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">할인은 두 값이 양수이고 산식·집계·날짜 규칙이 맞을 때만 계산합니다. 업종 구성이 다르면 숫자만으로 싸다고 읽지 않습니다.</p>
      {snapshot.relatives.map((row) => (
        <article key={`${row.leftId}-${row.rightId}`} className="rounded-lg border border-line bg-surface p-4 text-sm">
          <h2 className="text-xl">
            {nameOf(snapshot, row.leftIndex)} / {nameOf(snapshot, row.rightIndex)}
          </h2>
          <p className="mt-1 tabular-nums">
            {formatRatio(row.leftValue)} ({row.leftDate ?? "—"}) · {formatRatio(row.rightValue)} ({row.rightDate ?? "—"})
          </p>
          {row.enabled ? (
            <p className="mt-2">
              왼쪽은 오른쪽 대비 {row.direction} {formatPercent(row.discountPercent?.replace("-", "") ?? null)}
            </p>
          ) : (
            <p className="mt-2 text-caution">수량 비교 꺼짐 · {row.reason}</p>
          )}
          <p className="text-muted">공통 월 {row.commonMonths} · 맞추다 빠진 월 {row.lostMonths}</p>
        </article>
      ))}
    </section>
  );
}

function nameOf(snapshot: Snapshot, id: string): string {
  return snapshot.cards.find((c) => c.indexId === id)?.displayName ?? id;
}

function Scenario({ currencyNote }: { currencyNote: boolean }) {
  const [growth, setGrowth] = useState("0.20");
  const [growthKind, setGrowthKind] = useState<"cumulative" | "annualized">("cumulative");
  const [multiple, setMultiple] = useState("-0.25");
  const [book, setBook] = useState("0.10");
  const [pbrChange, setPbrChange] = useState("0");
  const [yieldAnnual, setYieldAnnual] = useState("");
  const [path, setPath] = useState<"none" | "cash_no_reinvestment" | "reinvested">("none");
  const [startFx, setStartFx] = useState("1300");
  const [endFx, setEndFx] = useState("1430");
  let per = "계산 불가";
  let pbr = "계산 불가";
  let divNote = "";
  let divExtra = "";
  let fx: string | null = null;
  try {
    const perRaw = priceReturn({ growth, growthKind, years: 3, multipleChange: multiple });
    const pbrRaw = priceReturn({ growth: book, growthKind, years: 3, multipleChange: pbrChange });
    per = safeRatio(perRaw);
    pbr = safeRatio(pbrRaw);
    const div = dividendTotal({ priceReturn: perRaw, dividendYieldAnnual: yieldAnnual || null, years: 3, path });
    divNote = div.note;
    divExtra = div.withDividends ? `배당 포함 ${safeRatio(div.withDividends)}` : "";
    if (startFx && endFx) fx = safeRatio(krwInvestorReturn({ usdAssetReturn: perRaw, startKrwPerUsd: startFx, endKrwPerUsd: endFx }));
  } catch {
    fx = null;
  }
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-2xl">3년 사용자 가정</h2>
      <p className="mt-1 text-sm text-caution">이것은 예측이 아닙니다. PER 시나리오와 PBR 시나리오는 가격 수익률의 다른 분해이며 더하거나 곱하지 않습니다.</p>
      <p className="mt-2 text-sm text-muted">가격 배수 = (나중 이익 / 처음 이익) × (나중 배수 / 처음 배수) − 1. 이익이 줄면 배수가 그대로여도 가격 수익률은 같이 줄어듭니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="이익 성장 (0.20 = 20%)">
          <input className={selectCls} value={growth} onChange={(e) => setGrowth(e.target.value)} />
        </Field>
        <Field label="PER 변화 (-0.25 = 25% 하락)">
          <input className={selectCls} value={multiple} onChange={(e) => setMultiple(e.target.value)} />
        </Field>
        <Field label="장부가 성장">
          <input className={selectCls} value={book} onChange={(e) => setBook(e.target.value)} />
        </Field>
        <Field label="PBR 변화">
          <input className={selectCls} value={pbrChange} onChange={(e) => setPbrChange(e.target.value)} />
        </Field>
        <Field label="성장의 의미">
          <select className={selectCls} value={growthKind} onChange={(e) => setGrowthKind(e.target.value as "cumulative" | "annualized")}>
            <option value="cumulative">3년 누적</option>
            <option value="annualized">연율, 3년 복리</option>
          </select>
        </Field>
        <Field label="연 배당수익률 (선택)">
          <input className={selectCls} value={yieldAnnual} onChange={(e) => setYieldAnnual(e.target.value)} placeholder="0.015" />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["none", "cash_no_reinvestment", "reinvested"] as const).map((item) => (
          <button key={item} className={path === item ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm"} onClick={() => setPath(item)}>
            {item === "none" ? "배당 제외" : item === "cash_no_reinvestment" ? "현금 배당" : "배당 재투자"}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="rounded-lg bg-bg p-3 text-sm">PER 경로 가격 수익률 <span className="tabular-nums">{per}</span></p>
        <p className="rounded-lg bg-bg p-3 text-sm">PBR 경로 가격 수익률 <span className="tabular-nums">{pbr}</span></p>
      </div>
      <p className="mt-2 text-sm text-muted">{divNote} {divExtra}</p>
      {currencyNote ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="시작 원/달러">
            <input className={selectCls} value={startFx} onChange={(e) => setStartFx(e.target.value)} />
          </Field>
          <Field label="끝 원/달러">
            <input className={selectCls} value={endFx} onChange={(e) => setEndFx(e.target.value)} />
          </Field>
          <p className="text-sm sm:col-span-2">원화 투자자 수익률 (1+달러 수익률)×(끝 환율/시작 환율)−1 = <span className="tabular-nums">{fx ?? "계산 불가"}</span></p>
        </div>
      ) : null}
    </section>
  );
}

function safeRatio(value: string): string {
  try {
    return formatPercent(String(Number(value) * 100));
  } catch {
    return "계산 불가";
  }
}

function Method({ payload, onRefresh }: { payload: Payload; onRefresh: () => void }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl">출처 상태</h2>
        <button className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={onRefresh}>
          상태만 점검
        </button>
      </div>
      <p className="text-sm text-muted">감사일 {payload.auditDate}. 점검 버튼은 외부 시세를 가져오지 않습니다. 실패한 점검이 이미 있는 숫자를 지우지는 않습니다.</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th className="p-2">출처</th>
              <th className="p-2">상태</th>
              <th className="p-2">저장</th>
              <th className="p-2">공개</th>
              <th className="p-2">내보내기</th>
            </tr>
          </thead>
          <tbody>
            {payload.providers.map((p) => (
              <tr key={p.id} className="border-t border-line align-top">
                <td className="p-2">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted">{p.notes}</p>
                </td>
                <td className="p-2">{availabilityKo(p.availability)}</td>
                <td className="p-2">{p.storage}</td>
                <td className="p-2">{p.publicDisplay}</td>
                <td className="p-2">{p.export}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="text-xl">최근 실행</h3>
      {payload.runs.length === 0 ? <p className="text-sm text-muted">실행 기록 없음</p> : null}
      <ul className="space-y-1 text-sm">
        {payload.runs.map((run) => (
          <li key={run.id}>
            {run.status} · {run.providerId ?? "—"} · {run.error ?? "오류 없음"}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">관리 보호: {payload.admin === "token_required" ? "INGEST_TOKEN 필요" : "토큰 미설정이라 이 환경에서는 가져오기가 열려 있습니다."}</p>
      <p className="text-sm">의도한 갱신 시각은 서울 07:30과 18:00입니다. 이 배포의 크론 한도는 확인하지 않았으므로 자동 두 번 실행을 켜지 않았고, 수동 점검만 둡니다.</p>
    </section>
  );
}

function availabilityKo(value: string): string {
  if (value === "ready") return "가져오기 준비";
  if (value === "needs_credentials") return "자격 필요";
  if (value === "needs_license") return "라이선스 필요";
  if (value === "unsupported_metric") return "지표 미지원";
  return "일시적으로 쓰지 않음";
}

function ImportPanel({
  perMetricId,
  pbrMetricId,
  onPer,
  onPbr,
  metrics,
  onLoaded,
}: {
  perMetricId: string;
  pbrMetricId: string;
  onPer: (id: string) => void;
  onPbr: (id: string) => void;
  metrics: { id: string; label: string; family: string }[];
  onLoaded: (kind: "imported" | "fixture") => void;
}) {
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const per = metrics.filter((m) => m.family === "per");
  const pbr = metrics.filter((m) => m.family === "pbr");
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">가져오기</h2>
      <p className="text-sm text-muted">날짜는 YYYY-MM-DD만 받습니다. 셀의 주소는 내려받지 않고, 수식은 거절합니다. 미리보기 뒤에만 반영합니다.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="PER 정의">
          <select className={selectCls} value={perMetricId} onChange={(e) => onPer(e.target.value)}>
            {per.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="PBR 정의">
          <select className={selectCls} value={pbrMetricId} onChange={(e) => onPbr(e.target.value)}>
            {pbr.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="min-h-11 rounded-lg border border-line px-3 text-sm"
          onClick={() => csvTemplate().then((text) => download("template.csv", text, "text/csv"))}
        >
          빈 형식 받기
        </button>
        <button
          className="min-h-11 rounded-lg border border-line px-3 text-sm"
          onClick={() =>
            loadFixture({ data: {} }).then((result) => {
              setMessage(`연습 표본 ${result.result.inserted}행 추가, ${result.result.unchanged}행은 그대로입니다.`);
              onLoaded("fixture");
            })
          }
        >
          연습 표본 넣기
        </button>
      </div>
      <textarea
        className="min-h-40 w-full rounded-lg border border-line bg-surface p-3 text-sm"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="CSV를 붙여 넣습니다."
        aria-label="CSV"
      />
      <input
        className="block text-sm"
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 1_500_000) {
            setMessage("파일이 너무 큽니다.");
            return;
          }
          setCsv(await file.text());
        }}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="min-h-11 rounded-lg border border-line px-3 text-sm"
          onClick={() =>
            previewUpload({ data: { csv } }).then((result) => {
              setPreview(`반영 후보 ${result.inserts.length} · 거절 ${result.rejected.length} · 네트워크 조회 ${result.fetchedHosts.length}`);
              if (result.rejected[0]) setMessage(`${result.rejected[0].line}행 ${result.rejected[0].reason}`);
            })
          }
        >
          미리보기
        </button>
        <button
          className="min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg"
          onClick={() =>
            commitUpload({ data: { csv } }).then((result) => {
              if (!result.ok) {
                setMessage(result.error);
                return;
              }
              setMessage(`추가 ${result.result.inserted}, 동일 ${result.result.unchanged}, 충돌 격리 ${result.result.conflicts}`);
              onLoaded("imported");
            })
          }
        >
          반영
        </button>
      </div>
      {preview ? <p className="text-sm">{preview}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </section>
  );
}
