create table if not exists indices (
  id text primary key,
  display_name text not null,
  official_name text not null,
  role text not null,
  timezone text not null,
  calendar_id text not null,
  currency text not null,
  symbols_json text not null,
  documentation_url text not null,
  notes text not null default ''
);

create table if not exists providers (
  id text primary key,
  name text not null,
  availability text not null,
  permission_storage text not null,
  permission_cache text not null,
  permission_private_display text not null,
  permission_public_display text not null,
  permission_export text not null,
  documentation_url text not null default '',
  allowed_hosts text not null default '[]',
  notes text not null default '',
  metrics text not null default '',
  history text not null default '',
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_observed_date date,
  last_failure_reason text,
  health_status text not null default 'unknown'
);

create table if not exists series (
  id text primary key,
  index_id text not null references indices (id),
  metric_id text not null,
  provider_id text not null references providers (id),
  methodology_version text not null,
  frequency text not null,
  date_semantics text not null,
  dataset_kind text not null,
  earnings_basis text not null,
  loss_treatment text not null,
  aggregation_method text not null,
  index_weighting text not null,
  negative_equity_treatment text not null,
  float_adjustment text not null default 'unknown',
  missing_financial_treatment text not null default 'unknown',
  statement_scope text not null default 'unknown',
  equity_attribution text not null default 'unknown',
  accounting_framework text not null default 'unknown',
  interpolated boolean not null default false,
  methodology_break boolean not null default false,
  expected_history_start date not null
);

create table if not exists observation_revisions (
  revision_id text primary key,
  series_id text not null references series (id),
  observation_date date not null,
  session_close_at timestamptz,
  value numeric,
  status text not null,
  reason_code text,
  price_as_of date,
  financial_period_end date,
  available_at text,
  availability_precision text not null,
  retrieved_at timestamptz not null,
  is_estimate boolean not null,
  estimate_origin text not null,
  denominator_status text not null,
  denominator_evidence text not null,
  source_url text not null,
  source_record_id text,
  source_hash text,
  methodology_version text not null,
  supersedes_revision_id text,
  vintage_mode text not null,
  explicit_source_row boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists observation_source_hash_idx
  on observation_revisions (series_id, observation_date, source_hash);

create table if not exists observation_conflicts (
  id text primary key,
  series_id text not null,
  observation_date date not null,
  left_revision_id text not null,
  right_revision_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists import_rejections (
  id text primary key,
  line_no integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists ingestion_runs (
  id text primary key,
  provider_id text,
  status text not null,
  checkpoint text,
  requested_start date,
  requested_end date,
  rows_seen integer not null default 0,
  rows_inserted integer not null default 0,
  rows_unchanged integer not null default 0,
  rows_rejected integer not null default 0,
  error text,
  last_observation_date date,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists ingestion_lock (
  id integer primary key,
  holder text not null,
  acquired_at timestamptz not null
);

create table if not exists report_snapshots (
  id text primary key,
  fingerprint text not null unique,
  payload text not null,
  created_at timestamptz not null default now()
);
