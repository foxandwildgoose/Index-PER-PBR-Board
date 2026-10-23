import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUsEarlyClose, latestCompletedSession, sessionClose } from "./calendar.ts";
import { classifyDenominator, classifyIncoming, crossCompatible, datesMatch, descriptiveRevisionAllowed, discountPercent, krwInvestorReturn, priceReturn, strictRevisionAllowed } from "./compare.ts";
import { annualTable, coverageGate, monthlyGrid, referenceWindow, type MonthCell } from "./coverage.ts";
import { assertAllowedHost, previewImport } from "./import-csv.ts";
import { protectCsvField } from "./export-csv.ts";
import { applyIngestionResult, emptyFreshness } from "./freshness.ts";
import { practiceSeries } from "./fixture.ts";
import { midrankPercentile, quantileType7 } from "./stats.ts";
import { buildSnapshot, snapshotExports } from "./snapshot.ts";

describe("percentile and quantiles", () => {
  it("midrank of 20 inside [10,20,20,40] is 50", () => {
    assert.equal(midrankPercentile(["10", "20", "20", "40"], "20"), "50");
  });

  it("type 7, empty, one point, ties, and outside values", () => {
    assert.equal(quantileType7([], 0.5), null);
    assert.equal(quantileType7(["5"], 0.25), "5");
    assert.equal(quantileType7(["10", "20", "20", "40"], 0.5), "20");
    assert.equal(quantileType7(["10", "20", "20", "40"], 0.25), "17.5");
    assert.equal(quantileType7(["10", "20", "20", "40"], 0), "10");
    assert.equal(quantileType7(["10", "20", "20", "40"], 1), "40");
    assert.equal(midrankPercentile(["10", "20", "20", "40"], "5"), "0");
    assert.equal(midrankPercentile(["10", "20", "20", "40"], "50"), "100");
    assert.equal(midrankPercentile([], "10"), null);
  });
});

describe("scenarios", () => {
  it("20% cumulative earnings and a 25% lower PER is a -10% price return", () => {
    assert.equal(priceReturn({ growth: "0.20", growthKind: "cumulative", years: 3, multipleChange: "-0.25" }), "-0.1");
  });

  it("a 20% earnings decline with an unchanged multiple is -20%", () => {
    assert.equal(priceReturn({ growth: "-0.20", growthKind: "cumulative", years: 3, multipleChange: "0" }), "-0.2");
  });

  it("PER and PBR scenarios stay separate and FX uses KRW per USD", () => {
    const per = priceReturn({ growth: "0.20", growthKind: "cumulative", years: 3, multipleChange: "-0.25" });
    const pbr = priceReturn({ growth: "0.10", growthKind: "cumulative", years: 3, multipleChange: "0.05" });
    assert.notEqual(per, pbr);
    assert.equal(krwInvestorReturn({ usdAssetReturn: "0.10", startKrwPerUsd: "1300", endKrwPerUsd: "1430" }), "0.21");
  });
});

describe("cleaning", () => {
  it("nonpositive denominator, zero sentinel, and a high 2009 PER", () => {
    const bad = classifyDenominator({ value: "120", denominatorStatus: "negative", zeroIsSentinel: false });
    assert.equal(bad.status, "not_meaningful");
    const sentinel = classifyDenominator({ value: "0", denominatorStatus: "unknown", zeroIsSentinel: true });
    assert.equal(sentinel.value, null);
    assert.equal(sentinel.status, "missing");
    assert.equal(sentinel.reason, "vendor_zero_sentinel");
    const crisis = classifyDenominator({ value: "86.5", denominatorStatus: "positive", zeroIsSentinel: false });
    assert.equal(crisis.status, "valid");
    assert.equal(crisis.value, "86.5");
  });

  it("provider TTM stays reported; a price roll-forward is an application estimate", () => {
    const reported = classifyIncoming({ declaredEstimate: false, estimateOrigin: "none", rollForward: false });
    assert.equal(reported.isEstimate, false);
    assert.equal(reported.estimateOrigin, "none");
    const rolled = classifyIncoming({ declaredEstimate: false, estimateOrigin: "none", rollForward: true });
    assert.equal(rolled.isEstimate, true);
    assert.equal(rolled.estimateOrigin, "application");
  });
});

describe("calendar and windows", () => {
  it("selects completed sessions around the fixed Korean cutoff", () => {
    assert.equal(latestCompletedSession("XKRX", "2026-10-23T09:30:00+09:00"), "2026-10-22");
    assert.equal(latestCompletedSession("XNYS", "2026-10-23T09:30:00+09:00"), "2026-10-22");
    assert.equal(latestCompletedSession("XKRX", "2026-10-23T23:59:59+09:00"), "2026-10-23");
    assert.equal(latestCompletedSession("XNYS", "2026-10-23T23:59:59+09:00"), "2026-10-22");
    assert.equal(latestCompletedSession("XKRX", "2026-10-09T18:00:00+09:00"), "2026-10-08");
    assert.equal(sessionClose("XNYS", "2026-10-22"), "2026-10-22T20:00:00.000Z");
    assert.equal(sessionClose("XNYS", "2026-01-15"), "2026-01-15T21:00:00.000Z");
    assert.equal(isUsEarlyClose("2026-11-27"), true);
  });

  it("September observation on an October 23 cutoff uses August as the reference end", () => {
    const window = referenceWindow({ currentObservationDate: "2026-09-30", cutoffIso: "2026-10-23T23:59:59+09:00" });
    assert.equal(window.referenceEnd, "2026-08");
    assert.equal(window.referenceMonthCount, 320);
    assert.equal(window.requestedEnd, "2026-09");
    assert.equal(window.requestedMonthCount, 321);
    const october = referenceWindow({ currentObservationDate: "2026-10-22", cutoffIso: "2026-10-23T23:59:59+09:00" });
    assert.equal(october.referenceEnd, "2026-09");
    assert.equal(october.referenceMonthCount, 321);
  });

  it("does not invent a month end or triplicate quarters", () => {
    const daily = monthlyGrid({
      points: [
        {
          observationDate: "2026-10-21",
          value: "10",
          status: "valid",
          frequency: "daily_close",
          explicitSourceRow: true,
          indexId: "SP500",
        },
      ],
      start: "2026-10",
      end: "2026-10",
      indexId: "SP500",
    });
    assert.equal(daily.cells[0]?.state, "missing_inferred");
    assert.notEqual(daily.cells[0]?.value, "10");
    const quarterly = monthlyGrid({
      points: [
        {
          observationDate: "2026-03-31",
          value: "11",
          status: "valid",
          frequency: "quarterly",
          explicitSourceRow: true,
          indexId: "SP500",
        },
      ],
      start: "2026-01",
      end: "2026-03",
      indexId: "SP500",
    });
    assert.equal(quarterly.frequencyNote?.includes("복제하지"), true);
    assert.equal(quarterly.cells.filter((c) => c.value === "11").length, 0);
  });

  it("does not treat a January print as a December year end", () => {
    const cells: MonthCell[] = [
      { month: "2001-01", state: "numeric", value: "15", observationDate: "2001-01-31", explicitSourceRow: true, inCrisis: false },
    ];
    const table = annualTable({ cells, mode: "year_end", firstYear: 2000, lastYear: 2001, ytdYear: null, januaryNotes: [] });
    assert.equal(table.find((r) => r.year === 2000)?.value, null);
    assert.equal(table.find((r) => r.year === 2001)?.value, null);
    assert.equal(table.find((r) => r.year === 2001)?.reason, "no_december_year_end");
  });

  it("a 2027 cutoff yields 2000-2026 completed years plus 2027 year to date", () => {
    const snapshot = buildSnapshot({
      series: [],
      executionIso: "2027-06-15T12:00:00+09:00",
      mode: "live",
      vintage: "CURRENT_VINTAGE_DESCRIPTIVE",
      dataset: "imported",
      annualMode: "year_end",
      historyWindow: "since_2000",
      perMetricId: "PER_TTM_REPORTED",
      pbrMetricId: "PBR_COMMON_EQUITY",
    });
    assert.equal(snapshot.annual[0]?.year, 2000);
    assert.equal(snapshot.annual.at(-1)?.year, 2027);
    assert.equal(snapshot.annual.at(-1)?.label, "ytd");
    assert.equal(snapshot.annual.find((r) => r.year === 2026)?.label, "completed");
    assert.equal(snapshot.annual.some((r) => r.year === 2028), false);
  });
});

describe("gates, vintage, and compatibility", () => {
  function cells(spec: MonthCell["state"][]): MonthCell[] {
    return spec.map((state, i) => ({
      month: `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
      state,
      value: state === "numeric" ? "10" : null,
      observationDate: null,
      explicitSourceRow: state !== "missing_inferred",
      inCrisis: false,
    }));
  }

  it("counts explicit not-meaningful rows as observed and app gaps as unobserved", () => {
    const mixed = cells([...Array(48).fill("numeric"), ...Array(9).fill("not_meaningful"), ...Array(3).fill("missing_inferred")]);
    const gate = coverageGate({
      cells: mixed,
      expectedStart: mixed[0]!.month,
      methodologyBreak: false,
      definitionsKnown: true,
      freshnessOk: true,
      unresolvedConflict: false,
      distributionMismatch: false,
    });
    assert.equal(gate.observedCoverage, "0.95");
    assert.equal(gate.numericCoverage, "0.8");
    assert.equal(gate.qualified, true);
    const gaps = cells([...Array(48).fill("numeric"), ...Array(12).fill("missing_inferred")]);
    const weak = coverageGate({
      cells: gaps,
      expectedStart: gaps[0]!.month,
      methodologyBreak: false,
      definitionsKnown: true,
      freshnessOk: true,
      unresolvedConflict: false,
      distributionMismatch: false,
    });
    assert.equal(weak.observedCoverage, "0.8");
    assert.equal(weak.qualified, false);
    assert.notEqual(weak.observedCoverage, "1");
  });

  it("unknown definitions fail compatibility and post-cutoff revisions stay out of strict mode", () => {
    const unknown = crossCompatible(
      {
        metricId: "PER_PROVIDER_UNVERIFIED",
        family: "per",
        earningsBasis: "unknown",
        lossTreatment: "unknown",
        aggregationMethod: "unknown",
        indexWeighting: "unknown",
        negativeEquityTreatment: "unknown",
        frequency: "monthly_close",
        dateSemantics: "unknown",
      },
      {
        metricId: "PER_PROVIDER_UNVERIFIED",
        family: "per",
        earningsBasis: "unknown",
        lossTreatment: "unknown",
        aggregationMethod: "unknown",
        indexWeighting: "unknown",
        negativeEquityTreatment: "unknown",
        frequency: "monthly_close",
        dateSemantics: "unknown",
      },
    );
    assert.equal(unknown.ok, false);
    const cutoffs = { valuationCutoff: "2026-10-23T14:59:59.000Z", knowledgeCutoff: "2026-10-23T14:59:59.000Z" };
    assert.equal(
      strictRevisionAllowed(
        { availableAt: null, availabilityPrecision: "unknown", vintageMode: "unknown", observationDate: "2026-09-30", sessionCloseAt: null },
        cutoffs,
      ).ok,
      false,
    );
    const laterKnowledge = { valuationCutoff: "2026-10-23T14:59:59.000Z", knowledgeCutoff: "2026-11-02T00:00:00.000Z" };
    const revision = {
      availableAt: "2026-10-30T00:00:00.000Z",
      availabilityPrecision: "timestamp" as const,
      vintageMode: "current_vintage" as const,
      observationDate: "2026-09-30",
      sessionCloseAt: null,
    };
    assert.equal(strictRevisionAllowed({ ...revision, vintageMode: "point_in_time" }, { ...laterKnowledge, knowledgeCutoff: laterKnowledge.valuationCutoff }).ok, false);
    assert.equal(descriptiveRevisionAllowed(revision, laterKnowledge).ok, true);
  });

  it("matches different local month-end dates only under the month rule", () => {
    assert.equal(datesMatch("same_calendar_month_final_local_session", "2026-12-30", "2026-12-31"), true);
    assert.equal(datesMatch("exact_observation_date", "2026-12-30", "2026-12-31"), false);
  });
});

describe("fixture snapshot agreement", () => {
  it("keeps the 2009 spike, blocks a since-2000 label on the 2010 series, and exports the same annual value", () => {
    const snapshot = buildSnapshot({
      series: practiceSeries(),
      executionIso: "2026-10-23T09:44:00+09:00",
      mode: "fixed",
      vintage: "CURRENT_VINTAGE_DESCRIPTIVE",
      dataset: "fixture",
      annualMode: "year_end",
      historyWindow: "since_2000",
      perMetricId: "PER_TTM_REPORTED",
      pbrMetricId: "PBR_COMMON_EQUITY",
    });
    assert.equal(snapshot.fixture, true);
    const sp = snapshot.cards.find((c) => c.indexId === "SP500");
    assert.ok(sp?.per.value);
    assert.equal(sp?.per.qualified, true);
    assert.equal(sp?.per.referenceEnd, "2026-08");
    assert.equal(sp?.per.referenceMonthCount, 320);
    assert.equal(sp?.per.requestedMonthCount, 321);
    const kospi = snapshot.cards.find((c) => c.indexId === "KOSPI");
    assert.equal(kospi?.per.seriesId, null);
    assert.equal(kospi?.per.statusText, "자료 없음");
    const fy = buildSnapshot({
      ...{
        series: practiceSeries(),
        executionIso: "2026-10-23T09:44:00+09:00",
        mode: "fixed" as const,
        vintage: "CURRENT_VINTAGE_DESCRIPTIVE" as const,
        dataset: "fixture" as const,
        annualMode: "year_end" as const,
        historyWindow: "since_2000" as const,
        perMetricId: "PER_FY0",
        pbrMetricId: "PBR_COMMON_EQUITY",
      },
    });
    const kospiFy = fy.cards.find((c) => c.indexId === "KOSPI")?.per;
    assert.equal(kospiFy?.qualified, false);
    assert.equal(kospiFy?.partial, true);
    assert.equal((kospiFy?.positionLabel ?? "").includes("2000"), false);
    const exported = snapshotExports(snapshot);
    const year = snapshot.annual.find((r) => r.year === 2009);
    const cell = year?.cells["SP500:PER_TTM_REPORTED"];
    assert.ok(cell?.value);
    assert.match(exported.csv, new RegExp(cell!.value!));
    assert.match(exported.metadata, new RegExp(snapshot.snapshotId));
    assert.equal(exported.metadata.includes("연습 표본"), true);
    const pair = snapshot.relatives.find((r) => r.leftIndex === "SP500" && r.rightIndex === "NASDAQ_COMPOSITE");
    assert.equal(pair?.enabled, false);
    assert.equal(discountPercent("10", "12")?.direction, "할인");
  });
});

describe("import and operations", () => {
  it("rejects formulas, ambiguous dates, and does not fetch cell URLs", () => {
    const bad = previewImport("index_id,metric_id,observation_date,source_url,value\nSP500,PER_TTM_REPORTED,01/02/2000,https://example.test,=1+1\n");
    assert.equal(bad.inserts.length, 0);
    assert.ok(bad.rejected.length > 0);
    assert.deepEqual(bad.fetchedHosts, []);
    assert.equal(assertAllowedHost("http://169.254.169.254/latest", ["www.econ.yale.edu"]), false);
    const shielded = protectCsvField('=HYPERLINK("http://evil")', false);
    assert.match(shielded, /'=HYPERLINK/);
    assert.equal(protectCsvField("-10.5", true), "-10.5");
  });

  it("an old successful fetch does not refresh staleness, and a failure keeps the prior date", () => {
    const prior = applyIngestionResult(emptyFreshness(), {
      ok: true,
      at: "2026-10-01T00:00:00.000Z",
      maxObservationDate: "2024-01-31",
      reason: null,
      expectedSession: "2026-10-22",
    });
    assert.equal(prior.state, "stale");
    const again = applyIngestionResult(prior, {
      ok: true,
      at: "2026-10-23T00:00:00.000Z",
      maxObservationDate: "2024-01-31",
      reason: null,
      expectedSession: "2026-10-22",
    });
    assert.equal(again.latestObservedDate, "2024-01-31");
    assert.equal(again.lastAdvancedAt, prior.lastAdvancedAt);
    assert.equal(again.state, "stale");
    const failed = applyIngestionResult(again, {
      ok: false,
      at: "2026-10-23T01:00:00.000Z",
      maxObservationDate: null,
      reason: "timeout",
      expectedSession: "2026-10-22",
    });
    assert.equal(failed.latestObservedDate, "2024-01-31");
    assert.equal(failed.failure, "timeout");
  });
});
