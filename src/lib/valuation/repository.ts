import { createHash } from "node:crypto";
import type { Sql } from "@/lib/db";
import { INDICES, PROVIDERS } from "./registry.ts";
import { practiceSeries } from "./fixture.ts";
import type { ImportRow } from "./import-csv.ts";
import type { SnapshotSeries } from "./snapshot.ts";
import { applyIngestionResult, emptyFreshness, type FreshnessRecord } from "./freshness.ts";

export function redact(message: string): string {
  return message.replace(/([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Za-z0-9_]*)[=:]\s*\S+/gi, "$1=[redacted]");
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asDate(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  return text.slice(0, 10);
}

export async function ensureRegistry(sql: Sql): Promise<void> {
  for (const index of INDICES) {
    await sql`
      insert into indices (id, display_name, official_name, role, timezone, calendar_id, currency, symbols_json, documentation_url, notes)
      values (${index.id}, ${index.displayName}, ${index.officialName}, ${index.role}, ${index.timezone}, ${index.calendarId}, ${index.currency}, ${JSON.stringify(index.symbols)}, ${index.documentationUrl}, ${index.notes})
      on conflict (id) do nothing
    `;
  }
  for (const provider of PROVIDERS) {
    await sql`
      insert into providers (
        id, name, availability, permission_storage, permission_cache, permission_private_display,
        permission_public_display, permission_export, documentation_url, allowed_hosts, notes, metrics, history, health_status
      ) values (
        ${provider.id}, ${provider.name}, ${provider.availability}, ${provider.storage}, ${provider.cache},
        ${provider.privateDisplay}, ${provider.publicDisplay}, ${provider.export}, ${provider.documentationUrl},
        ${JSON.stringify(provider.allowedHosts)}, ${provider.notes}, ${provider.metrics}, ${provider.history},
        ${provider.availability}
      )
      on conflict (id) do update set
        availability = excluded.availability,
        notes = excluded.notes,
        health_status = excluded.health_status,
        metrics = excluded.metrics,
        history = excluded.history
    `;
  }
}

async function ensureSeries(sql: Sql, row: {
  id: string;
  indexId: string;
  metricId: string;
  providerId: string;
  methodologyVersion: string;
  frequency: string;
  dateSemantics: string;
  datasetKind: string;
  earningsBasis: string;
  lossTreatment: string;
  aggregationMethod: string;
  indexWeighting: string;
  negativeEquityTreatment: string;
  interpolated: boolean;
  methodologyBreak: boolean;
  expectedStart: string;
}): Promise<void> {
  await sql`
    insert into series (
      id, index_id, metric_id, provider_id, methodology_version, frequency, date_semantics, dataset_kind,
      earnings_basis, loss_treatment, aggregation_method, index_weighting, negative_equity_treatment,
      interpolated, methodology_break, expected_history_start
    ) values (
      ${row.id}, ${row.indexId}, ${row.metricId}, ${row.providerId}, ${row.methodologyVersion}, ${row.frequency},
      ${row.dateSemantics}, ${row.datasetKind}, ${row.earningsBasis}, ${row.lossTreatment}, ${row.aggregationMethod},
      ${row.indexWeighting}, ${row.negativeEquityTreatment}, ${row.interpolated}, ${row.methodologyBreak}, ${row.expectedStart}
    )
    on conflict (id) do nothing
  `;
}

export interface CommitResult {
  inserted: number;
  unchanged: number;
  conflicts: number;
  rejected: number;
}

export async function commitRows(sql: Sql, rows: ImportRow[], datasetKind: "imported" | "fixture"): Promise<CommitResult> {
  const result: CommitResult = { inserted: 0, unchanged: 0, conflicts: 0, rejected: 0 };
  for (const row of rows) {
    const seriesId = `${datasetKind}:${row.providerId}:${row.indexId}:${row.metricId}:${row.methodologyVersion}`;
    await ensureSeries(sql, {
      id: seriesId,
      indexId: row.indexId,
      metricId: row.metricId,
      providerId: row.providerId,
      methodologyVersion: row.methodologyVersion,
      frequency: row.frequency,
      dateSemantics: row.dateSemantics,
      datasetKind,
      earningsBasis: row.earningsBasis,
      lossTreatment: row.lossTreatment,
      aggregationMethod: row.aggregationMethod,
      indexWeighting: row.indexWeighting,
      negativeEquityTreatment: row.negativeEquityTreatment,
      interpolated: row.dateSemantics.includes("interpolated"),
      methodologyBreak: false,
      expectedStart: row.observationDate,
    });
    const hash = sha(JSON.stringify({
      seriesId,
      date: row.observationDate,
      value: row.value,
      status: row.status,
      vintage: row.vintageMode,
      availableAt: row.availableAt,
      source: row.sourceUrl,
    }));
    const existing = await sql<{ revision_id: string; source_hash: string | null }>`
      select revision_id, source_hash from observation_revisions
      where series_id = ${seriesId} and observation_date = ${row.observationDate}
      order by created_at desc
      limit 1
    `;
    const head = existing[0];
    if (head?.source_hash === hash) {
      result.unchanged += 1;
      continue;
    }
    const conflict = Boolean(head && head.source_hash !== hash);
    const revisionId = conflict ? `rev_${hash.slice(0, 16)}_conflict` : `rev_${hash.slice(0, 20)}`;
    const status = conflict ? "source_conflict" : row.status;
    await sql`
      insert into observation_revisions (
        revision_id, series_id, observation_date, session_close_at, value, status, reason_code,
        price_as_of, financial_period_end, available_at, availability_precision, retrieved_at,
        is_estimate, estimate_origin, denominator_status, denominator_evidence, source_url,
        source_hash, methodology_version, supersedes_revision_id, vintage_mode, explicit_source_row
      ) values (
        ${revisionId}, ${seriesId}, ${row.observationDate}, ${row.sessionCloseAt}, ${conflict ? null : row.value},
        ${status}, ${conflict ? "source_conflict" : row.reasonCode}, ${row.priceAsOf}, ${row.financialPeriodEnd},
        ${row.availableAt}, ${row.availabilityPrecision}, now(), ${row.isEstimate}, ${row.estimateOrigin},
        ${row.denominatorStatus}, ${row.denominatorEvidence}, ${row.sourceUrl}, ${hash}, ${row.methodologyVersion},
        ${head?.revision_id ?? null}, ${row.vintageMode}, true
      )
      on conflict (revision_id) do nothing
    `;
    if (conflict && head) {
      result.conflicts += 1;
      await sql`
        insert into observation_conflicts (id, series_id, observation_date, left_revision_id, right_revision_id)
        values (${`c_${hash.slice(0, 16)}`}, ${seriesId}, ${row.observationDate}, ${head.revision_id}, ${revisionId})
        on conflict (id) do nothing
      `;
    } else {
      result.inserted += 1;
    }
  }
  return result;
}

export async function loadPracticeFixture(sql: Sql): Promise<CommitResult> {
  const series = practiceSeries();
  const rows: ImportRow[] = [];
  for (const item of series) {
    for (const point of item.points) {
      rows.push({
        indexId: item.indexId,
        metricId: item.metricId,
        observationDate: point.observationDate,
        value: point.value,
        status: point.status === "not_meaningful" ? "not_meaningful" : point.status === "missing" ? "missing" : "valid",
        reasonCode: point.reasonCode,
        priceAsOf: point.priceAsOf,
        financialPeriodEnd: point.financialPeriodEnd,
        availableAt: point.availableAt,
        availabilityPrecision: point.availabilityPrecision,
        isEstimate: point.isEstimate,
        estimateOrigin: point.estimateOrigin,
        denominatorStatus: point.denominatorStatus,
        denominatorEvidence: point.denominatorEvidence,
        sourceUrl: point.sourceUrl,
        methodologyVersion: item.methodologyVersion,
        vintageMode: point.vintageMode,
        frequency: item.frequency,
        dateSemantics: item.dateSemantics,
        earningsBasis: item.earningsBasis,
        providerId: item.providerId,
        sessionCloseAt: point.sessionCloseAt,
        lossTreatment: item.lossTreatment,
        aggregationMethod: item.aggregationMethod,
        indexWeighting: item.indexWeighting,
        negativeEquityTreatment: item.negativeEquityTreatment,
        zeroIsSentinel: false,
      });
    }
  }
  return commitRows(sql, rows, "fixture");
}

interface DbPoint {
  revision_id: string;
  series_id: string;
  observation_date: unknown;
  session_close_at: unknown;
  value: unknown;
  status: SnapshotSeries["points"][number]["status"];
  reason_code: string | null;
  price_as_of: unknown;
  financial_period_end: unknown;
  available_at: string | null;
  availability_precision: SnapshotSeries["points"][number]["availabilityPrecision"];
  retrieved_at: unknown;
  is_estimate: boolean;
  estimate_origin: SnapshotSeries["points"][number]["estimateOrigin"];
  denominator_status: SnapshotSeries["points"][number]["denominatorStatus"];
  denominator_evidence: SnapshotSeries["points"][number]["denominatorEvidence"];
  source_url: string;
  vintage_mode: SnapshotSeries["points"][number]["vintageMode"];
  explicit_source_row: boolean;
  index_id: string;
  metric_id: string;
  provider_id: string;
  dataset_kind: SnapshotSeries["datasetKind"];
  frequency: SnapshotSeries["frequency"];
  date_semantics: string;
  earnings_basis: string;
  loss_treatment: string;
  aggregation_method: string;
  index_weighting: string;
  negative_equity_treatment: string;
  methodology_version: string;
  methodology_break: boolean;
  interpolated: boolean;
  created_at: unknown;
}

export async function loadSeries(sql: Sql): Promise<SnapshotSeries[]> {
  const rows = await sql<DbPoint>`
    select r.revision_id, r.series_id, r.observation_date, r.session_close_at, r.value::text as value, r.status,
      r.reason_code, r.price_as_of, r.financial_period_end, r.available_at, r.availability_precision, r.retrieved_at,
      r.is_estimate, r.estimate_origin, r.denominator_status, r.denominator_evidence, r.source_url, r.vintage_mode,
      r.explicit_source_row, r.created_at, s.index_id, s.metric_id, s.provider_id, s.dataset_kind, s.frequency,
      s.date_semantics, s.earnings_basis, s.loss_treatment, s.aggregation_method, s.index_weighting,
      s.negative_equity_treatment, s.methodology_version, s.methodology_break, s.interpolated
    from observation_revisions r
    join series s on s.id = r.series_id
    order by r.series_id, r.observation_date, r.created_at desc
  `;
  const seen = new Set<string>();
  const grouped = new Map<string, SnapshotSeries>();
  for (const row of rows) {
    const key = `${row.series_id}:${asDate(row.observation_date)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let series = grouped.get(row.series_id);
    if (!series) {
      series = {
        seriesId: row.series_id,
        indexId: row.index_id,
        metricId: row.metric_id,
        providerId: row.provider_id,
        datasetKind: row.dataset_kind,
        frequency: row.frequency,
        dateSemantics: row.date_semantics,
        earningsBasis: row.earnings_basis,
        lossTreatment: row.loss_treatment,
        aggregationMethod: row.aggregation_method,
        indexWeighting: row.index_weighting,
        negativeEquityTreatment: row.negative_equity_treatment,
        methodologyVersion: row.methodology_version,
        methodologyBreak: row.methodology_break,
        interpolated: row.interpolated,
        points: [],
      };
      grouped.set(row.series_id, series);
    }
    series.points.push({
      revisionId: row.revision_id,
      observationDate: asDate(row.observation_date) ?? "",
      sessionCloseAt: asText(row.session_close_at),
      value: row.value == null ? null : String(row.value),
      status: row.status,
      reasonCode: row.reason_code,
      priceAsOf: asDate(row.price_as_of),
      financialPeriodEnd: asDate(row.financial_period_end),
      availableAt: row.available_at,
      availabilityPrecision: row.availability_precision,
      retrievedAt: asText(row.retrieved_at) ?? new Date(0).toISOString(),
      isEstimate: row.is_estimate,
      estimateOrigin: row.estimate_origin,
      denominatorStatus: row.denominator_status,
      denominatorEvidence: row.denominator_evidence,
      sourceUrl: row.source_url,
      vintageMode: row.vintage_mode,
      explicitSourceRow: row.explicit_source_row,
    });
  }
  return [...grouped.values()];
}

export async function rejectionCount(sql: Sql): Promise<number> {
  const rows = await sql<{ n: number }>`select count(*)::int as n from import_rejections`;
  return Number(rows[0]?.n ?? 0);
}

export async function rememberRejections(sql: Sql, rows: { line: number; reason: string }[]): Promise<void> {
  for (const row of rows) {
    const id = `rej_${Date.now()}_${row.line}_${sha(row.reason).slice(0, 8)}`;
    await sql`insert into import_rejections (id, line_no, reason) values (${id}, ${row.line}, ${row.reason})`;
  }
}

export async function recordRun(sql: Sql, input: {
  id: string;
  providerId: string | null;
  status: string;
  error: string | null;
  rowsSeen: number;
  rowsInserted: number;
  rowsUnchanged: number;
  rowsRejected: number;
  lastObservation: string | null;
}): Promise<void> {
  await sql`
    insert into ingestion_runs (
      id, provider_id, status, rows_seen, rows_inserted, rows_unchanged, rows_rejected, error, last_observation_date, finished_at
    ) values (
      ${input.id}, ${input.providerId}, ${input.status}, ${input.rowsSeen}, ${input.rowsInserted},
      ${input.rowsUnchanged}, ${input.rowsRejected}, ${input.error ? redact(input.error) : null}, ${input.lastObservation}, now()
    )
  `;
  if (input.providerId) {
    await sql`
      update providers set
        last_attempt_at = now(),
        last_failure_reason = ${input.error ? redact(input.error) : null},
        last_success_at = case when ${input.status} = 'succeeded' then now() else last_success_at end,
        last_observed_date = coalesce(${input.lastObservation}, last_observed_date)
      where id = ${input.providerId}
    `;
  }
}

export async function listRuns(sql: Sql): Promise<{ id: string; providerId: string | null; status: string; error: string | null; createdAt: string }[]> {
  const rows = await sql<{ id: string; provider_id: string | null; status: string; error: string | null; created_at: unknown }>`
    select id, provider_id, status, error, created_at from ingestion_runs order by created_at desc limit 12
  `;
  return rows.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    status: row.status,
    error: row.error ? redact(row.error) : null,
    createdAt: asText(row.created_at) ?? "",
  }));
}

export async function withLock(sql: Sql, holder: string): Promise<boolean> {
  const rows = await sql<{ holder: string }>`
    insert into ingestion_lock (id, holder, acquired_at) values (1, ${holder}, now())
    on conflict (id) do update set holder = excluded.holder, acquired_at = now()
    where ingestion_lock.acquired_at < now() - interval '15 minutes'
    returning holder
  `;
  return rows[0]?.holder === holder;
}

export async function saveSnapshot(sql: Sql, id: string, payload: string): Promise<void> {
  await sql`
    insert into report_snapshots (id, fingerprint, payload) values (${id}, ${id}, ${payload})
    on conflict (id) do nothing
  `;
}

export function preserveOnFailedRun(prev: FreshnessRecord, at: string, reason: string): FreshnessRecord {
  return applyIngestionResult(prev.latestObservedDate ? prev : emptyFreshness(), {
    ok: false,
    at,
    maxObservationDate: null,
    reason,
    expectedSession: null,
  });
}
