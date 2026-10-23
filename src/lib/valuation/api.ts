import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PROVIDERS, INDICES, METRICS, AUDIT_DATE } from "./registry.ts";
import { templateCsv } from "./import-csv.ts";

const Filters = z.object({
  mode: z.enum(["fixed", "live"]),
  vintage: z.enum(["STRICT_AS_KNOWN", "CURRENT_VINTAGE_DESCRIPTIVE"]),
  dataset: z.enum(["imported", "fixture"]),
  annualMode: z.enum(["year_end", "annual_mean"]),
  historyWindow: z.enum(["since_2000", "trailing_10y", "trailing_5y"]),
  perMetricId: z.string(),
  pbrMetricId: z.string(),
});

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function gate(token: string | undefined): "open_because_unset" | "ok" {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) return "open_because_unset";
  if (token !== expected) throw new Error("관리 토큰이 맞지 않습니다.");
  return "ok";
}

export const getDashboard = createServerFn({ method: "POST" })
  .validator(Filters)
  .handler(async ({ data }) => {
    const { ensureRegistry, loadSeries, rejectionCount, saveSnapshot, listRuns } = await import("./repository.ts");
    const { buildSnapshot, snapshotExports } = await import("./snapshot.ts");
    const sql = await db();
    await ensureRegistry(sql);
    const series = await loadSeries(sql);
    const snapshot = buildSnapshot({
      series,
      executionIso: new Date().toISOString(),
      mode: data.mode,
      vintage: data.vintage,
      dataset: data.dataset,
      annualMode: data.annualMode,
      historyWindow: data.historyWindow,
      perMetricId: data.perMetricId,
      pbrMetricId: data.pbrMetricId,
      sourcedButRejected: await rejectionCount(sql),
    });
    await saveSnapshot(sql, snapshot.snapshotId, JSON.stringify({ id: snapshot.snapshotId, cards: snapshot.cards }));
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
        history: p.history,
      })),
    };
  });

export const previewUpload = createServerFn({ method: "POST" })
  .validator(z.object({ csv: z.string().max(1_500_000), token: z.string().optional() }))
  .handler(async ({ data }) => {
    gate(data.token);
    const { previewImport } = await import("./import-csv.ts");
    const { redact } = await import("./repository.ts");
    const preview = previewImport(data.csv);
    return {
      ...preview,
      rejected: preview.rejected.map((row) => ({ ...row, raw: redact(row.raw).slice(0, 240) })),
    };
  });

export const commitUpload = createServerFn({ method: "POST" })
  .validator(z.object({ csv: z.string().max(1_500_000), token: z.string().optional() }))
  .handler(async ({ data }) => {
    gate(data.token);
    const { previewImport } = await import("./import-csv.ts");
    const { commitRows, ensureRegistry, recordRun, rememberRejections, withLock, redact } = await import("./repository.ts");
    const preview = previewImport(data.csv);
    const sql = await db();
    await ensureRegistry(sql);
    const holder = `import_${Date.now()}`;
    const locked = await withLock(sql, holder);
    if (!locked) return { ok: false, error: "다른 가져오기가 진행 중입니다.", preview };
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
        lastObservation: null,
      });
      return { ok: false, error: "반영할 행이 없습니다.", preview };
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
      lastObservation: preview.inserts.map((r) => r.observationDate).sort().at(-1) ?? null,
    });
    return { ok: true, result, preview: { ...preview, rejected: preview.rejected.map((r) => ({ ...r, raw: redact(r.raw).slice(0, 180) })) } };
  });

export const loadFixture = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().optional() }))
  .handler(async ({ data }) => {
    gate(data.token);
    const { ensureRegistry, loadPracticeFixture, recordRun } = await import("./repository.ts");
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
      lastObservation: "2026-09-30",
    });
    return { ok: true, result, label: "연습 표본" };
  });

export const refreshSources = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().optional() }))
  .handler(async ({ data }) => {
    gate(data.token);
    const { ensureRegistry, recordRun, listRuns } = await import("./repository.ts");
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
        lastObservation: null,
      });
    }
    return { ok: true, runs: await listRuns(sql), note: "네트워크 수집은 하지 않았습니다. 자격과 이용 허락이 없는 출처는 상태만 기록합니다." };
  });

export const csvTemplate = createServerFn({ method: "GET" }).handler(async () => templateCsv());
