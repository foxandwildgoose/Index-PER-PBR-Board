//#region node_modules/.nitro/vite/services/ssr/assets/db-_Iyif_J6.js
var _0002_valuation_default = "create table if not exists indices (\n  id text primary key,\n  display_name text not null,\n  official_name text not null,\n  role text not null,\n  timezone text not null,\n  calendar_id text not null,\n  currency text not null,\n  symbols_json text not null,\n  documentation_url text not null,\n  notes text not null default ''\n);\n\ncreate table if not exists providers (\n  id text primary key,\n  name text not null,\n  availability text not null,\n  permission_storage text not null,\n  permission_cache text not null,\n  permission_private_display text not null,\n  permission_public_display text not null,\n  permission_export text not null,\n  documentation_url text not null default '',\n  allowed_hosts text not null default '[]',\n  notes text not null default '',\n  metrics text not null default '',\n  history text not null default '',\n  last_attempt_at timestamptz,\n  last_success_at timestamptz,\n  last_observed_date date,\n  last_failure_reason text,\n  health_status text not null default 'unknown'\n);\n\ncreate table if not exists series (\n  id text primary key,\n  index_id text not null references indices (id),\n  metric_id text not null,\n  provider_id text not null references providers (id),\n  methodology_version text not null,\n  frequency text not null,\n  date_semantics text not null,\n  dataset_kind text not null,\n  earnings_basis text not null,\n  loss_treatment text not null,\n  aggregation_method text not null,\n  index_weighting text not null,\n  negative_equity_treatment text not null,\n  float_adjustment text not null default 'unknown',\n  missing_financial_treatment text not null default 'unknown',\n  statement_scope text not null default 'unknown',\n  equity_attribution text not null default 'unknown',\n  accounting_framework text not null default 'unknown',\n  interpolated boolean not null default false,\n  methodology_break boolean not null default false,\n  expected_history_start date not null\n);\n\ncreate table if not exists observation_revisions (\n  revision_id text primary key,\n  series_id text not null references series (id),\n  observation_date date not null,\n  session_close_at timestamptz,\n  value numeric,\n  status text not null,\n  reason_code text,\n  price_as_of date,\n  financial_period_end date,\n  available_at text,\n  availability_precision text not null,\n  retrieved_at timestamptz not null,\n  is_estimate boolean not null,\n  estimate_origin text not null,\n  denominator_status text not null,\n  denominator_evidence text not null,\n  source_url text not null,\n  source_record_id text,\n  source_hash text,\n  methodology_version text not null,\n  supersedes_revision_id text,\n  vintage_mode text not null,\n  explicit_source_row boolean not null default true,\n  created_at timestamptz not null default now()\n);\n\ncreate unique index if not exists observation_source_hash_idx\n  on observation_revisions (series_id, observation_date, source_hash);\n\ncreate table if not exists observation_conflicts (\n  id text primary key,\n  series_id text not null,\n  observation_date date not null,\n  left_revision_id text not null,\n  right_revision_id text not null,\n  created_at timestamptz not null default now()\n);\n\ncreate table if not exists import_rejections (\n  id text primary key,\n  line_no integer not null,\n  reason text not null,\n  created_at timestamptz not null default now()\n);\n\ncreate table if not exists ingestion_runs (\n  id text primary key,\n  provider_id text,\n  status text not null,\n  checkpoint text,\n  requested_start date,\n  requested_end date,\n  rows_seen integer not null default 0,\n  rows_inserted integer not null default 0,\n  rows_unchanged integer not null default 0,\n  rows_rejected integer not null default 0,\n  error text,\n  last_observation_date date,\n  created_at timestamptz not null default now(),\n  finished_at timestamptz\n);\n\ncreate table if not exists ingestion_lock (\n  id integer primary key,\n  holder text not null,\n  acquired_at timestamptz not null\n);\n\ncreate table if not exists report_snapshots (\n  id text primary key,\n  fingerprint text not null unique,\n  payload text not null,\n  created_at timestamptz not null default now()\n);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("@electric-sql/pglite");
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_valuation.sql": _0002_valuation_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
//#endregion
export { getSql };
