import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "@/lib/db";
import { previewImport } from "./import-csv.ts";
import { commitRows, ensureRegistry, loadSeries, preserveOnFailedRun, recordRun } from "./repository.ts";
import { emptyFreshness } from "./freshness.ts";

function wrap(db: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
    const result = await db.query<T>(text, params);
    return result.rows;
  };
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run(text, values);
  }) as Sql;
  sql.query = run;
  return sql;
}

const row = `SP500,PER_TTM_REPORTED,2009-03-31,86.5,valid,2009-03-31,2008-12-31,2009-04-15,date,false,none,positive,source_explicit,https://example.test/licensed,provider-v1,point_in_time,monthly_close,month_end_close,ttm_reported,manual_upload,, ,include_losses_in_aggregate,aggregate_earnings_over_aggregate_price,float_adjusted,not_meaningful_if_nonpositive,no`;

describe("isolated database flow", () => {
  it("imports, quarantines a conflict, and keeps rows after a failed run", async () => {
    const db = new PGlite();
    await db.exec(readFileSync("migrations/0002_valuation.sql", "utf8"));
    const sql = wrap(db);
    await ensureRegistry(sql);
    const header = "index_id,metric_id,observation_date,value,status,price_as_of,financial_period_end,available_at,availability_precision,is_estimate,estimate_origin,denominator_status,denominator_evidence,source_url,methodology_version,vintage_mode,frequency,date_semantics,earnings_basis,provider_id,reason_code,session_close_at,loss_treatment,aggregation_method,index_weighting,negative_equity_treatment,zero_is_sentinel";
    const first = previewImport(`${header}\n${row}\n`);
    assert.equal(first.rejected.length, 0, JSON.stringify(first.rejected));
    const inserted = await commitRows(sql, first.inserts, "imported");
    assert.equal(inserted.inserted, 1);
    const again = await commitRows(sql, first.inserts, "imported");
    assert.equal(again.unchanged, 1);
    const changed = previewImport(`${header}\n${row.replace("86.5", "90")}\n`);
    const conflict = await commitRows(sql, changed.inserts, "imported");
    assert.equal(conflict.conflicts, 1);
    const series = await loadSeries(sql);
    assert.equal(series.length, 1);
    assert.equal(series[0]?.points.length, 1);
    assert.equal(series[0]?.points[0]?.status, "source_conflict");
    const before = await sql<{ n: number }>`select count(*)::int as n from observation_revisions`;
    await recordRun(sql, {
      id: "fail-1",
      providerId: "manual_upload",
      status: "failed",
      error: "KRX_API_KEY=supersecret timeout",
      rowsSeen: 0,
      rowsInserted: 0,
      rowsUnchanged: 0,
      rowsRejected: 0,
      lastObservation: null,
    });
    const after = await sql<{ n: number }>`select count(*)::int as n from observation_revisions`;
    assert.equal(Number(after[0]?.n), Number(before[0]?.n));
    const runs = await sql<{ error: string }>`select error from ingestion_runs`;
    assert.equal(String(runs[0]?.error).includes("supersecret"), false);
    assert.match(String(runs[0]?.error), /redacted/);
    const kept = preserveOnFailedRun(
      { ...emptyFreshness(), latestObservedDate: "2009-03-31", state: "stale" },
      "2026-10-23T00:00:00.000Z",
      "timeout",
    );
    assert.equal(kept.latestObservedDate, "2009-03-31");
    await db.close();
  });
});
