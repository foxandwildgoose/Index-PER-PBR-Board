import { o as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { C as formatRatio, E as krwInvestorReturn, P as priceReturn, S as formatPercent, b as dividendTotal, c as METRICS } from "./compare-DexODRht.mjs";
import { a as string, i as object, t as _enum } from "../_libs/zod.mjs";
import { t as FIXTURE_FORMULA } from "./fixture-DNVFgN3J.mjs";
import { a as CartesianGrid, c as Tooltip, i as Line, n as YAxis, o as ReferenceLine, r as XAxis, s as ResponsiveContainer, t as LineChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-jI9Nw4Sh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
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
var getDashboard = createServerFn({ method: "POST" }).validator(Filters).handler(createSsrRpc("2ae1fda00eb01e6bf527a491547e923255e781f33f47e15b2273d2300f4e4a71"));
var previewUpload = createServerFn({ method: "POST" }).validator(object({
	csv: string().max(15e5),
	token: string().optional()
})).handler(createSsrRpc("1c79812a9307bdf393a2f286af364c8cac0a7a761d936156c628e51733614137"));
var commitUpload = createServerFn({ method: "POST" }).validator(object({
	csv: string().max(15e5),
	token: string().optional()
})).handler(createSsrRpc("610e7d6e858390b1000f288a41f2e5a940963739d5e540fd6d71ca5703b02dfd"));
var loadFixture = createServerFn({ method: "POST" }).validator(object({ token: string().optional() })).handler(createSsrRpc("567671c72657d1ff3d603f53b8edf61708f3cd0e1530abed84ad8d484813a2ee"));
var refreshSources = createServerFn({ method: "POST" }).validator(object({ token: string().optional() })).handler(createSsrRpc("77179ce1ede29249823c6eb7ac1517ab5973acca01497ef7eac395ec88a0edc2"));
var csvTemplate = createServerFn({ method: "GET" }).handler(createSsrRpc("dadd08f83a606dd15fc0df1652bcd2c7944ccf90a887fcdd25411a50b50499b7"));
var TABS = [
	{
		id: "overview",
		label: "개요"
	},
	{
		id: "history",
		label: "추이"
	},
	{
		id: "annual",
		label: "연간 비교"
	},
	{
		id: "relative",
		label: "상대 비교"
	},
	{
		id: "scenario",
		label: "시나리오"
	},
	{
		id: "method",
		label: "자료·방법론"
	},
	{
		id: "import",
		label: "가져오기"
	}
];
var REASON = {
	year_to_date_not_year_end: "연중 · 연말 아님",
	no_december_year_end: "12월 말 없음",
	not_meaningful: "의미 없음",
	no_numeric_months: "자료 없음",
	"자료 없음": "자료 없음"
};
function Desk() {
	const [tab, setTab] = (0, import_react.useState)("overview");
	const [mode, setMode] = (0, import_react.useState)("fixed");
	const [vintage, setVintage] = (0, import_react.useState)("CURRENT_VINTAGE_DESCRIPTIVE");
	const [dataset, setDataset] = (0, import_react.useState)("imported");
	const [annualMode, setAnnualMode] = (0, import_react.useState)("year_end");
	const [historyWindow, setHistoryWindow] = (0, import_react.useState)("since_2000");
	const [perMetricId, setPerMetricId] = (0, import_react.useState)("PER_TTM_REPORTED");
	const [pbrMetricId, setPbrMetricId] = (0, import_react.useState)("PBR_COMMON_EQUITY");
	const [payload, setPayload] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [nonce, setNonce] = (0, import_react.useState)(0);
	const [chartIndex, setChartIndex] = (0, import_react.useState)("SP500");
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		setLoading(true);
		getDashboard({ data: {
			mode,
			vintage,
			dataset,
			annualMode,
			historyWindow,
			perMetricId,
			pbrMetricId
		} }).then((next) => {
			if (!cancel) {
				setPayload(next);
				setError(null);
			}
		}).catch((err) => {
			if (!cancel) setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
		}).finally(() => {
			if (!cancel) setLoading(false);
		});
		return () => {
			cancel = true;
		};
	}, [
		mode,
		vintage,
		dataset,
		annualMode,
		historyWindow,
		perMetricId,
		pbrMetricId,
		nonce
	]);
	const snapshot = payload?.snapshot;
	const hasNumbers = snapshot?.cards.some((c) => c.per.value || c.pbr.value) ?? false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-5 flex flex-col gap-3 border-b border-line pb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-accent",
					children: "개인 리서치 · 매수·매도 신호가 아닙니다"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl text-ink sm:text-4xl",
						children: "지수 밸류에이션 이력"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-2xl text-sm text-muted",
						children: "S&P 500, 나스닥 종합, 코스피, 코스닥의 PER·PBR이 2000년 이후 분포에서 어디쯤인지 봅니다. 정의가 다르면 한 칸에 섞지 않습니다."
					})] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "기준",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: selectCls,
							value: mode,
							onChange: (e) => setMode(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "fixed",
								children: "고정 기준일 2026-10-23"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "live",
								children: "지금 시각"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "빈티지",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: selectCls,
							value: vintage,
							onChange: (e) => setVintage(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "CURRENT_VINTAGE_DESCRIPTIVE",
								children: "현재 빈티지 서술"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "STRICT_AS_KNOWN",
								children: "엄격 시점"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "자료",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: selectCls,
							value: dataset,
							onChange: (e) => {
								if (e.target.value === "fixture") loadFixture({ data: {} }).then(() => setDataset("fixture"));
								else setDataset("imported");
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "imported",
								children: "가져온 자료"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "fixture",
								children: "연습 표본"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "분포 창",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: selectCls,
							value: historyWindow,
							onChange: (e) => setHistoryWindow(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "since_2000",
									children: "2000년 이후"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "trailing_10y",
									children: "최근 10년"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "trailing_5y",
									children: "최근 5년"
								})
							]
						})
					})
				]
			}),
			snapshot?.fixture ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-4 rounded-lg border border-caution bg-caution-bg px-3 py-2 text-sm text-caution",
				children: ["연습 표본입니다. 시장 데이터가 아닙니다. ", FIXTURE_FORMULA]
			}) : null,
			snapshot?.strictBlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink",
				children: "공표 시점을 증명하지 못하는 행은 엄격 시점에서 빠집니다. 그때 알 수 있던 정보로 단정하지 않습니다."
			}) : null,
			snapshot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cutoff, { snapshot }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				role: "tablist",
				"aria-label": "화면",
				className: "mb-4 flex gap-2 overflow-x-auto",
				onKeyDown: (e) => moveTab(e, tab, setTab),
				children: TABS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					role: "tab",
					"aria-selected": tab === item.id,
					className: tab === item.id ? "min-h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg" : "min-h-11 shrink-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink",
					onClick: () => setTab(item.id),
					children: item.label
				}, item.id))
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "자료를 읽고 있습니다."
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-caution",
				children: error
			}) : null,
			snapshot && tab === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, {
				snapshot,
				hasNumbers,
				onFixture: () => setDataset("fixture"),
				onImport: () => setTab("import")
			}) : null,
			snapshot && tab === "history" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {
				snapshot,
				indexId: chartIndex,
				onIndex: setChartIndex,
				mounted,
				perMetricId,
				pbrMetricId
			}) : null,
			snapshot && tab === "annual" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Annual, {
				snapshot,
				annualMode,
				onMode: setAnnualMode,
				csv: payload?.csv ?? "",
				metadata: payload?.metadata ?? ""
			}) : null,
			snapshot && tab === "relative" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Relative, { snapshot }) : null,
			snapshot && tab === "scenario" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scenario, { currencyNote: snapshot.cards.some((c) => c.indexId === "SP500") }) : null,
			snapshot && payload && tab === "method" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Method, {
				payload,
				onRefresh: () => refreshSources({ data: {} }).then(() => setNonce((n) => n + 1))
			}) : null,
			tab === "import" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportPanel, {
				perMetricId,
				pbrMetricId,
				onPer: setPerMetricId,
				onPbr: setPbrMetricId,
				metrics: payload?.metrics ?? METRICS,
				onLoaded: (kind) => setDataset(kind)
			}) : null
		]
	});
}
var selectCls = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink";
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1 block",
			children: label
		}), children]
	});
}
function moveTab(e, tab, setTab) {
	const i = TABS.findIndex((t) => t.id === tab);
	if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
	if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
}
function Cutoff({ snapshot }) {
	const kr = snapshot.sessions.filter((s) => s.indexId === "KOSPI" || s.indexId === "KOSDAQ");
	const us = snapshot.sessions.filter((s) => s.indexId === "SP500" || s.indexId === "NASDAQ_COMPOSITE");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mb-4 grid gap-2 rounded-lg border border-line bg-surface p-3 text-sm sm:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: "유효 컷오프 "
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums",
				children: seoul(snapshot.effectiveCutoff)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: "가치 / 지식 "
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: [
					seoul(snapshot.valuationCutoff),
					" / ",
					seoul(snapshot.knowledgeCutoff)
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: "한국 세션 "
			}), kr.map((s) => s.session ?? "없음").join(" · ") || "없음"] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: "미국 세션 "
			}), us.map((s) => `${s.indexId === "SP500" ? "S&P" : "나스닥"} ${s.session ?? "없음"}`).join(" · ")] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "sm:col-span-2 text-muted",
				children: [
					"스냅샷 ",
					snapshot.snapshotId,
					" · ",
					snapshot.calculationVersion,
					" · ",
					snapshot.vintage === "STRICT_AS_KNOWN" ? "엄격 시점" : "현재 빈티지 서술"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sm:col-span-2 text-muted",
				children: snapshot.calendarNote
			})
		]
	});
}
function seoul(iso) {
	return new Intl.DateTimeFormat("ko-KR", {
		timeZone: "Asia/Seoul",
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(iso));
}
function Overview({ snapshot, hasNumbers, onFixture, onImport }) {
	if (!hasNumbers) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl",
				children: "자료 없음"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm text-muted",
				children: "네 지수의 2000년 이후 PER·PBR을 확인된 무료 API로 채우지 않았습니다. KRX 오픈 API는 시세이지 투자지표가 아니고, S&P·나스닥 펀더멘털은 라이선스가 필요합니다. 빈 칸을 0으로 두거나 싼 값처럼 칠하지 않습니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-col gap-2 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg",
					onClick: onImport,
					children: "승인된 파일 가져오기"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-4 text-sm",
					onClick: () => {
						loadFixture({ data: {} }).then(() => onFixture());
					},
					children: "계산 연습 표본 보기"
				})]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "grid gap-3 md:grid-cols-2",
		children: snapshot.cards.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "rounded-lg border border-line bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl",
					children: card.displayName
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotLine, {
					title: "PER",
					slot: card.per
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotLine, {
					title: "PBR",
					slot: card.pbr
				})
			]
		}, card.indexId))
	});
}
function SlotLine({ title, slot }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 border-t border-line pt-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-2xl tabular-nums",
					children: slot.value ? formatRatio(slot.value) : slot.statusText
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm",
				children: slot.metricLabel
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"관측 ",
					slot.observationDate ?? "—",
					" · 가격 ",
					slot.priceAsOf ?? "—",
					" · 재무 ",
					slot.financialPeriodEnd ?? "—"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					slot.isEstimate ? `추정치 (${slot.estimateOrigin})` : "추정치 아님",
					" · 출처 ",
					slot.providerId ?? "없음",
					" · ",
					slot.freshness
				]
			}),
			slot.qualified && slot.positionLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm",
				children: [
					slot.positionLabel,
					" · ",
					formatPercent(slot.percentile),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [
							" 표본 ",
							slot.sampleSize,
							"개월, 참조 끝 ",
							slot.referenceEnd,
							". 매매 지시가 아닙니다."
						]
					})
				]
			}) : null,
			slot.partial ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-caution",
				children: [
					"부분 이력입니다. ",
					slot.note || "합격 조건을 넘지 못했습니다.",
					" 백분위 ",
					slot.percentile ? formatPercent(slot.percentile) : "—",
					"는 서술일 뿐입니다."
				]
			}) : null,
			slot.insufficient && slot.seriesId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "과거 자료 부족"
			}) : null,
			!slot.seriesId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: slot.note
			}) : null,
			slot.reasons.length > 0 && slot.seriesId && !slot.qualified ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: ["사유 ", slot.reasons.join(", ")]
			}) : null
		]
	});
}
function History({ snapshot, indexId, onIndex, mounted, perMetricId, pbrMetricId }) {
	const per = snapshot.seriesViews.find((s) => s.indexId === indexId && s.metricId === perMetricId);
	const pbr = snapshot.seriesViews.find((s) => s.indexId === indexId && s.metricId === pbrMetricId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "지수",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: selectCls,
					value: indexId,
					onChange: (e) => onIndex(e.target.value),
					children: snapshot.cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: c.indexId,
						children: c.displayName
					}, c.indexId))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "빈 달은 잇지 않습니다. 중앙값과 10·90백분위는 참조 표본입니다. 위기 음영은 읽기용 표식이지 데이터가 아닙니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chart, {
				title: "PER",
				view: per,
				mounted
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chart, {
				title: "PBR",
				view: pbr,
				mounted
			})
		]
	});
}
function Chart({ title, view, mounted }) {
	if (!view) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "rounded-lg border border-line bg-surface p-4 text-sm",
		children: [title, " 자료 없음"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					view.windowStart,
					" – ",
					view.referenceEnd,
					view.dateSemantics === "monthly_average" ? " · 월평균이라 일별 종가가 아닙니다" : "",
					view.interpolated ? " · 보간 입력이 표시된 시계열" : "",
					view.current ? ` · 현재 관측 ${view.current.date ?? view.current.month} ${view.current.value ? formatRatio(view.current.value) : "자료 없음"}` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 h-64",
				children: mounted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data: view.chart,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { stroke: "#e3dcd0" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "month",
								tick: {
									fontSize: 11,
									fill: "#6e675e"
								},
								minTickGap: 28
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fontSize: 11,
									fill: "#6e675e"
								},
								width: 42
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (value) => value == null || value === "" ? "자료 없음" : formatRatio(String(value)) }),
							view.bands.median ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								y: Number(view.bands.median),
								stroke: "#1f4d3a",
								strokeDasharray: "4 4"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "linear",
								dataKey: "value",
								stroke: "#1c1915",
								strokeWidth: 1.6,
								dot: false,
								connectNulls: false
							})
						]
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "차트를 준비합니다."
				})
			}),
			!view.qualification.qualified ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-caution",
				children: ["합격 라벨 없음. ", view.qualification.reasons.join(", ") || "조건 미달"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "이 창은 합격 조건을 통과했습니다. 그래도 매매 신호는 아닙니다."
			})
		]
	});
}
function Annual({ snapshot, annualMode, onMode, csv, metadata }) {
	const metrics = [snapshot.perMetricId, snapshot.pbrMetricId];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex flex-col gap-2 sm:flex-row",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: annualMode === "year_end" ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => onMode("year_end"),
					children: "연말"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: annualMode === "annual_mean" ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => onMode("annual_mean"),
					children: "연간 평균"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => download("valuation.csv", csv, "text/csv"),
					children: "CSV"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => download("valuation.json", metadata, "application/json"),
					children: "메타데이터"
				})
			]
		}),
		snapshot.annualNotes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-sm text-muted",
			children: note
		}, note)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto rounded-lg border border-line",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "min-w-full border-collapse text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-surface text-left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "p-2",
						children: "연도"
					}), snapshot.cards.map((card) => metrics.map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
						className: "p-2 font-medium",
						children: [card.displayName, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-normal text-muted",
							children: metric.includes("PBR") ? "PBR" : "PER"
						})]
					}, `${card.indexId}-${metric}`)))] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [...snapshot.annual].reverse().map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-line",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
						className: "p-2 text-left font-medium tabular-nums",
						children: [row.year, row.label === "ytd" ? " 연중" : ""]
					}), snapshot.cards.map((card) => metrics.map((metric) => {
						const cell = row.cells[`${card.indexId}:${metric}`];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "p-2 tabular-nums text-ink",
							children: cell?.value ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [formatRatio(cell.value), annualMode === "annual_mean" && cell.count != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-muted",
								children: [cell.count, "개월"]
							}) : null] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-missing",
								children: REASON[cell?.reason ?? ""] ?? cell?.reason ?? "자료 없음"
							})
						}, `${row.year}-${card.indexId}-${metric}`);
					}))]
				}, row.year)) })]
			})
		})
	] });
}
function download(name, text, type) {
	const blob = new Blob([text], { type: `${type};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
}
function Relative({ snapshot }) {
	if (snapshot.relatives.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "같은 정의의 짝이 없습니다. 할인율은 켜지지 않습니다."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "할인은 두 값이 양수이고 산식·집계·날짜 규칙이 맞을 때만 계산합니다. 업종 구성이 다르면 숫자만으로 싸다고 읽지 않습니다."
		}), snapshot.relatives.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "rounded-lg border border-line bg-surface p-4 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "text-xl",
					children: [
						nameOf(snapshot, row.leftIndex),
						" / ",
						nameOf(snapshot, row.rightIndex)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 tabular-nums",
					children: [
						formatRatio(row.leftValue),
						" (",
						row.leftDate ?? "—",
						") · ",
						formatRatio(row.rightValue),
						" (",
						row.rightDate ?? "—",
						")"
					]
				}),
				row.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2",
					children: [
						"왼쪽은 오른쪽 대비 ",
						row.direction,
						" ",
						formatPercent(row.discountPercent?.replace("-", "") ?? null)
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-caution",
					children: ["수량 비교 꺼짐 · ", row.reason]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-muted",
					children: [
						"공통 월 ",
						row.commonMonths,
						" · 맞추다 빠진 월 ",
						row.lostMonths
					]
				})
			]
		}, `${row.leftId}-${row.rightId}`))]
	});
}
function nameOf(snapshot, id) {
	return snapshot.cards.find((c) => c.indexId === id)?.displayName ?? id;
}
function Scenario({ currencyNote }) {
	const [growth, setGrowth] = (0, import_react.useState)("0.20");
	const [growthKind, setGrowthKind] = (0, import_react.useState)("cumulative");
	const [multiple, setMultiple] = (0, import_react.useState)("-0.25");
	const [book, setBook] = (0, import_react.useState)("0.10");
	const [pbrChange, setPbrChange] = (0, import_react.useState)("0");
	const [yieldAnnual, setYieldAnnual] = (0, import_react.useState)("");
	const [path, setPath] = (0, import_react.useState)("none");
	const [startFx, setStartFx] = (0, import_react.useState)("1300");
	const [endFx, setEndFx] = (0, import_react.useState)("1430");
	let per = "계산 불가";
	let pbr = "계산 불가";
	let divNote = "";
	let divExtra = "";
	let fx = null;
	try {
		const perRaw = priceReturn({
			growth,
			growthKind,
			years: 3,
			multipleChange: multiple
		});
		const pbrRaw = priceReturn({
			growth: book,
			growthKind,
			years: 3,
			multipleChange: pbrChange
		});
		per = safeRatio(perRaw);
		pbr = safeRatio(pbrRaw);
		const div = dividendTotal({
			priceReturn: perRaw,
			dividendYieldAnnual: yieldAnnual || null,
			years: 3,
			path
		});
		divNote = div.note;
		divExtra = div.withDividends ? `배당 포함 ${safeRatio(div.withDividends)}` : "";
		if (startFx && endFx) fx = safeRatio(krwInvestorReturn({
			usdAssetReturn: perRaw,
			startKrwPerUsd: startFx,
			endKrwPerUsd: endFx
		}));
	} catch {
		fx = null;
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl",
				children: "3년 사용자 가정"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-caution",
				children: "이것은 예측이 아닙니다. PER 시나리오와 PBR 시나리오는 가격 수익률의 다른 분해이며 더하거나 곱하지 않습니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "가격 배수 = (나중 이익 / 처음 이익) × (나중 배수 / 처음 배수) − 1. 이익이 줄면 배수가 그대로여도 가격 수익률은 같이 줄어듭니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "이익 성장 (0.20 = 20%)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: growth,
							onChange: (e) => setGrowth(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PER 변화 (-0.25 = 25% 하락)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: multiple,
							onChange: (e) => setMultiple(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "장부가 성장",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: book,
							onChange: (e) => setBook(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PBR 변화",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: pbrChange,
							onChange: (e) => setPbrChange(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "성장의 의미",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: selectCls,
							value: growthKind,
							onChange: (e) => setGrowthKind(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "cumulative",
								children: "3년 누적"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "annualized",
								children: "연율, 3년 복리"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "연 배당수익률 (선택)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: yieldAnnual,
							onChange: (e) => setYieldAnnual(e.target.value),
							placeholder: "0.015"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					"none",
					"cash_no_reinvestment",
					"reinvested"
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: path === item ? "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => setPath(item),
					children: item === "none" ? "배당 제외" : item === "cash_no_reinvestment" ? "현금 배당" : "배당 재투자"
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "rounded-lg bg-bg p-3 text-sm",
					children: ["PER 경로 가격 수익률 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular-nums",
						children: per
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "rounded-lg bg-bg p-3 text-sm",
					children: ["PBR 경로 가격 수익률 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular-nums",
						children: pbr
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					divNote,
					" ",
					divExtra
				]
			}),
			currencyNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "시작 원/달러",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: startFx,
							onChange: (e) => setStartFx(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "끝 원/달러",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: selectCls,
							value: endFx,
							onChange: (e) => setEndFx(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm sm:col-span-2",
						children: ["원화 투자자 수익률 (1+달러 수익률)×(끝 환율/시작 환율)−1 = ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: fx ?? "계산 불가"
						})]
					})
				]
			}) : null
		]
	});
}
function safeRatio(value) {
	try {
		return formatPercent(String(Number(value) * 100));
	} catch {
		return "계산 불가";
	}
}
function Method({ payload, onRefresh }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl",
					children: "출처 상태"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: onRefresh,
					children: "상태만 점검"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"감사일 ",
					payload.auditDate,
					". 점검 버튼은 외부 시세를 가져오지 않습니다. 실패한 점검이 이미 있는 숫자를 지우지는 않습니다."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-lg border border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "min-w-full text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-surface text-left",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-2",
								children: "출처"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-2",
								children: "상태"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-2",
								children: "저장"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-2",
								children: "공개"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-2",
								children: "내보내기"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: payload.providers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line align-top",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "p-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted",
									children: p.notes
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-2",
								children: availabilityKo(p.availability)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-2",
								children: p.storage
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-2",
								children: p.publicDisplay
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-2",
								children: p.export
							})
						]
					}, p.id)) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-xl",
				children: "최근 실행"
			}),
			payload.runs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "실행 기록 없음"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1 text-sm",
				children: payload.runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					run.status,
					" · ",
					run.providerId ?? "—",
					" · ",
					run.error ?? "오류 없음"
				] }, run.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: ["관리 보호: ", payload.admin === "token_required" ? "INGEST_TOKEN 필요" : "토큰 미설정이라 이 환경에서는 가져오기가 열려 있습니다."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm",
				children: "의도한 갱신 시각은 서울 07:30과 18:00입니다. 이 배포의 크론 한도는 확인하지 않았으므로 자동 두 번 실행을 켜지 않았고, 수동 점검만 둡니다."
			})
		]
	});
}
function availabilityKo(value) {
	if (value === "ready") return "가져오기 준비";
	if (value === "needs_credentials") return "자격 필요";
	if (value === "needs_license") return "라이선스 필요";
	if (value === "unsupported_metric") return "지표 미지원";
	return "일시적으로 쓰지 않음";
}
function ImportPanel({ perMetricId, pbrMetricId, onPer, onPbr, metrics, onLoaded }) {
	const [csv, setCsv] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)(null);
	const [preview, setPreview] = (0, import_react.useState)(null);
	const per = metrics.filter((m) => m.family === "per");
	const pbr = metrics.filter((m) => m.family === "pbr");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl",
				children: "가져오기"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "날짜는 YYYY-MM-DD만 받습니다. 셀의 주소는 내려받지 않고, 수식은 거절합니다. 미리보기 뒤에만 반영합니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "PER 정의",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: selectCls,
						value: perMetricId,
						onChange: (e) => onPer(e.target.value),
						children: per.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: m.id,
							children: m.label
						}, m.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "PBR 정의",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: selectCls,
						value: pbrMetricId,
						onChange: (e) => onPbr(e.target.value),
						children: pbr.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: m.id,
							children: m.label
						}, m.id))
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => csvTemplate().then((text) => download("template.csv", text, "text/csv")),
					children: "빈 형식 받기"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => loadFixture({ data: {} }).then((result) => {
						setMessage(`연습 표본 ${result.result.inserted}행 추가, ${result.result.unchanged}행은 그대로입니다.`);
						onLoaded("fixture");
					}),
					children: "연습 표본 넣기"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				className: "min-h-40 w-full rounded-lg border border-line bg-surface p-3 text-sm",
				value: csv,
				onChange: (e) => setCsv(e.target.value),
				placeholder: "CSV를 붙여 넣습니다.",
				"aria-label": "CSV"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "block text-sm",
				type: "file",
				accept: ".csv,text/csv",
				onChange: async (e) => {
					const file = e.target.files?.[0];
					if (!file) return;
					if (file.size > 15e5) {
						setMessage("파일이 너무 큽니다.");
						return;
					}
					setCsv(await file.text());
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg border border-line px-3 text-sm",
					onClick: () => previewUpload({ data: { csv } }).then((result) => {
						setPreview(`반영 후보 ${result.inserts.length} · 거절 ${result.rejected.length} · 네트워크 조회 ${result.fetchedHosts.length}`);
						if (result.rejected[0]) setMessage(`${result.rejected[0].line}행 ${result.rejected[0].reason}`);
					}),
					children: "미리보기"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-fg",
					onClick: () => commitUpload({ data: { csv } }).then((result) => {
						if (!result.ok) {
							setMessage(result.error);
							return;
						}
						setMessage(`추가 ${result.result.inserted}, 동일 ${result.result.unchanged}, 충돌 격리 ${result.result.conflicts}`);
						onLoaded("imported");
					}),
					children: "반영"
				})]
			}),
			preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm",
				children: preview
			}) : null,
			message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: message
			}) : null
		]
	});
}
var SplitComponent = Desk;
//#endregion
export { SplitComponent as component };
