# Build a Private Historical Equity Valuation Dashboard

## 1. Assignment and intended outcome

Act as a senior full stack engineer and financial data engineer. Build a working personal research website that helps a Korean investor compare the historical price to earnings and price to book ratios of the S&P 500, Nasdaq Composite, KOSPI, and KOSDAQ from 2000 onward. The website must show what the available evidence supports, how recent it is, and where a current observation sits within a properly defined historical distribution.

Implement the application, ingestion workflow, calculation engine, persistence, useful exports, and verification. Do not stop at a product specification or static mockup. When a data source is unavailable, complete the usable application with truthful source status and a validated import workflow. Never manufacture market data to make a screen look complete.

The primary interface must be Korean. Use clear terminology, accessible charts, readable tables, and explanations suitable for an investor who understands markets but needs the data definitions made explicit. Code, identifiers, development documentation, and commit messages may be English. The dashboard is a research tool: historical valuation labels must not become automatic buy or sell instructions.

This prompt authorizes local implementation and verification when executed. Follow any existing repository instructions and explicit permissions in that session. Do not purchase subscriptions, accept paid contracts, obtain new paid credentials, send external notifications, or publish a public deployment without authorization. Keep working on independent implementation if one provider requires credentials or a separate license.

## 2. Inspect the repository and choose a practical architecture

First inspect the existing repository, package manifests, application structure, environment variable templates, deployment configuration, and project instructions. Preserve working conventions and unrelated changes. If an appropriate application already exists, extend it instead of replacing it. Explain important architectural decisions in a short development note.

For a new repository, prefer a currently supported stable Next.js release, TypeScript, a suitable React chart library, and PostgreSQL compatible with Neon. Verify current official documentation and package compatibility before installation; do not hardcode an assumed latest version from this prompt. Use the project's existing styling and authentication if available. Choose a small, maintainable stack rather than adding services without a concrete need.

Keep financial calculations in a pure, independently testable module. Provider adapters normalize data into a common contract; they do not silently redefine metrics. API handlers, charts, annual tables, exports, and summary cards must consume the same calculation results and snapshot identifiers.

Use short server requests for interactive reads and ingestion triggers. Implement large historical backfills as resumable background work with bounded chunks, checkpoints, cancellation, and retry. Do not attempt a 26 year backfill inside one web request. If the hosting environment cannot support a worker, provide a resumable command line ingestion process using the same adapters and database contract.

## 3. Define the index universe explicitly

Create an index registry with stable internal identifiers, official names, market timezone, trading calendar, base currency, provider symbols, and source documentation.

| Internal identifier | Main display name | Role |
|---|---|---|
| SP500 | S&P 500 | Primary index |
| NASDAQ_COMPOSITE | 나스닥 종합지수 | Primary index; Nasdaq COMP, sometimes represented by vendor symbol IXIC |
| KOSPI | 코스피 | Primary index |
| KOSDAQ | 코스닥 | Primary index |
| NASDAQ100 | 나스닥 100 | Optional, separately selected comparison; Nasdaq NDX |

Nasdaq Composite and Nasdaq-100 are different universes. Never replace one with the other because one has easier data access. Never confuse the exchange operator's stock, Nasdaq Inc. with ticker NDAQ, with either index. ETF valuation metrics for QQQ, ONEQ, SPY, or Korean ETFs are not automatically the corresponding index metrics. If ETF research is later added, place it in a clearly separate universe with its own definitions and history.

Do not reconstruct 2000 constituents using today's membership. An index level valuation published for each historical date may be used with its documented methodology. Constituent based reconstruction requires historical membership, weights, financial data vintages, corporate actions, and compatible aggregation rules.

## 4. Support a fixed reference date and an ongoing live mode

Provide two obvious modes:

1. **Fixed reference mode:** requested date `2026-10-23`, timezone `Asia/Seoul`. Set `requested_cutoff` to `2026-10-23T23:59:59+09:00`; set `effective_cutoff = min(execution_time, requested_cutoff)`.
2. **Live mode:** use the current execution timestamp, displayed in Asia/Seoul, and refresh according to configured source schedules.

For every index select the latest completed local regular session whose closing timestamp is at or before the effective cutoff. Use official or maintained exchange calendars, including holidays, exceptional closures, shortened sessions, and US daylight saving time. Do not infer trading sessions from weekdays alone.

The same global cutoff can legitimately produce different local observation dates. At a Korean morning cutoff, a completed US session and the preceding Korean session may both be the latest available. After the Korean close, Korea may have a later local date than the US. Always display actual local session dates; never label all values as October 23 merely because that is the report date.

A valuation observation also has publication and financial reporting constraints. Preserve `available_at` separately from `retrieved_at`. Downloading a revised series today does not prove that the revision was available at the historical cutoff. For a strict point in time view require evidence of the relevant publication vintage. If that evidence is missing, block strict point in time claims and offer a separately labeled current vintage historical view. A source publication date with unknown time must retain that uncertainty, with a conservative cutoff policy documented in metadata.

Model `valuation_cutoff` and `knowledge_cutoff` separately. For `STRICT_AS_KNOWN`, knowledge cutoff cannot exceed valuation cutoff and the selected revision must have supporting vintage evidence. For `CURRENT_VINTAGE_DESCRIPTIVE`, an explicitly selected secondary view may use historical revisions known by execution time while prices and observation periods remain at or before the valuation cutoff. Display both cutoffs and never promote that result to an as-known snapshot. This exception permits historical revisions, not future prices, future-period actual earnings substituted into a past denominator, or today's forecasts presented as the old consensus. Relative comparisons must use one consistent vintage mode.

Do not retroactively overwrite a saved report. A fixed report must reference immutable observation revisions and a snapshot ID so that it can be reproduced later.

## 5. Keep metric definitions separate

Implement an explicit metric and methodology registry. At minimum distinguish:

- Trailing 12 month reported earnings PER.
- Trailing operating or adjusted earnings PER.
- Latest fiscal year earnings PER, commonly FY0.
- Next 12 month consensus PER, commonly NTM.
- FY1 and FY2 consensus PER.
- Provider reported PER with an unverified earnings basis.
- PBR using attributable common equity, with its actual fiscal period.
- Provider reported PBR with an unverified book value basis.
- Shiller CAPE, as a separate optional supplementary series.

Do not relabel an exchange's FY0 PER as TTM. Do not equate FY1 with NTM. Do not merge reported earnings and operating earnings series. Keep source native metrics visible when useful, but label unknown definitions and prevent unsupported comparisons.

For each series record aggregation method, index weighting, float adjustment, loss making company treatment, missing financial treatment, negative equity treatment, consolidated versus separate statements, equity attribution, accounting framework, and methodology version. Unknown fields remain unknown. A generic methodology document is not proof that every product from that provider follows that methodology.

Never calculate an index PER as a simple or weighted arithmetic average of constituent PERs unless the chosen provider explicitly defines that product that way. For a documented aggregate reconstruction, numerator and denominator must cover the same eligible companies and adjustments. Preserve the actual rule rather than imposing one universal formula.

Financial statement inputs normally precede a ratio's price date. That fact alone does not make an official provider-published trailing PER or PBR an estimate. Preserve the provider's reported or estimated classification. If the application rolls an older ratio forward with a new price, or constructs its own value from separately obtained inputs, label that result as an application-derived estimate, retain both input dates, and verify denominator and universe compatibility. Never silently replace a provider observation with it. Do not represent a daily price update as newly reported financial data.

## 6. Discover providers before claiming data coverage

Start with a small source capability audit and save its findings in the repository. For every index and metric identify the provider product, documented access mechanism, actual earliest observation, frequency, date semantics, vintage availability, credentials required, and license constraints.

Prioritize official index providers and exchange datasets, then authorized financial data providers. Public aggregator pages can support a clearly attributed supplementary series when their definitions and permitted use are established. A page containing a current ratio is not evidence of a complete historical API.

Use a provider interface resembling:

```ts
interface ValuationProvider {
  capabilities(): Promise<ProviderCapabilities>;
  fetchObservations(request: ProviderRequest): Promise<ProviderBatch>;
  health(): Promise<ProviderHealth>;
}

type ProviderAvailability =
  | "ready" | "needs_credentials" | "needs_license"
  | "unsupported_metric" | "temporarily_unavailable";
```

Implement adapters only after verifying real documentation, an allowed endpoint or export route, and an actual response. Never invent URLs, API fields, query parameters, or claimed coverage. KRX index price APIs that begin in 2010 must not be presented as proof of PER/PBR access or 2000 coverage. A general Nasdaq price history service must not be assumed to expose valuation fundamentals.

Do not bypass login walls, CAPTCHAs, rate limits, contractual restrictions, or data entitlements. Provide manual import for an official or otherwise authorized CSV/Excel export when automated access is unavailable. A functioning import adapter is a valid production path; an adapter returning illustrative numbers is not.

Record storage, cache, private display, public display, and export permissions separately. Enforce permissions server side. Private access does not automatically grant redistribution or indefinite raw data retention. If permission is unknown, disable the affected operation pending configuration. Preserve provenance and hashes only within permitted retention rules. Do not place restricted raw data in a public repository or build output.

A fallback provider must create a different series version until definitions are verified compatible. Do not silently join two sources at a date boundary. Conflicting observations for the same declared series, date, and revision context require reconciliation or quarantine; values from deliberately different methodologies are separate series, not duplicates to average.

## 7. Data model and audit trail

Use migrations and typed validation. A practical relational model should include these entities:

- `indices`: identity, currency, calendar, timezone, official documentation.
- `providers`: capability status, permission policy, source documentation, operational configuration.
- `series`: index, metric, provider product, methodology version, frequency, date semantics, denominator rules, comparability group, expected history start.
- `observation_revisions`: immutable values and status, effective date, publication/vintage fields, retrieval time, provenance, and superseded revision relationship.
- `ingestion_runs`: request range, attempt, checkpoint, outcome, counts, errors, last successful observation date.
- `report_snapshots`: cutoff, filters, selected revisions, calculation version, dataset fingerprint, and generated time.

An observation contract should include:

```ts
type ValueStatus =
  | "valid" | "missing" | "not_meaningful"
  | "source_conflict" | "quarantined";

interface ObservationRevision {
  seriesId: string;
  observationDate: string;
  sessionCloseAt: string | null;
  value: string | null; // Decimal representation; never NaN or Infinity.
  status: ValueStatus;
  reasonCode: string | null;
  priceAsOf: string | null;
  financialPeriodEnd: string | null;
  availableAt: string | null;
  availabilityPrecision: "timestamp" | "date" | "unknown";
  retrievedAt: string;
  isEstimate: boolean;
  estimateOrigin: "provider" | "application" | "scenario" | "none";
  denominatorStatus: "positive" | "zero" | "negative" | "unknown";
  denominatorEvidence: "source_explicit" | "verified_reconstruction" | "unknown";
  sourceUrl: string;
  sourceRecordId: string | null;
  sourceHash: string | null;
  methodologyVersion: string;
  revisionId: string;
  supersedesRevisionId: string | null;
  vintageMode: "point_in_time" | "current_vintage" | "unknown";
}
```

Keep freshness, evidence confidence, and historical coverage as separate dimensions. A confidently sourced observation may be stale; a fresh page may have an old denominator. Define numeric precision and rounding centrally. Compute using unrounded values; round only for display. Preserve zero, missing, and not meaningful as distinct input states until source specific rules classify them.

Use append only observation revisions. Idempotent reimports should not create duplicates, but a changed value or source vintage must create a new revision. Preserve the former revision for reproducible snapshots where retention permits. Never silently replace historical values during a routine refresh.

## 8. Clean data without hiding economic stress

Validate dates, index identity, numeric format, units, duplicate keys, publication chronology, and source completeness before promotion to the analytical dataset. Keep rejected records with actionable reasons when allowed.

A zero may be a vendor sentinel. Convert it to null only after verifying that source's convention. A negative or zero aggregate earnings denominator makes ordinary PER not meaningful; do not call it extremely cheap. Apply the corresponding explicit rule to PBR with nonpositive equity. Retain the original source representation in permitted provenance.

Classify the denominator sign only from an explicit provider statement or a verified compatible reconstruction. Do not infer missing aggregate fundamentals from an absent ratio. Keep source sentinel evidence distinct from evidence of a genuine zero denominator.

Retain valid large positive crisis PER observations, including earnings collapse episodes such as 2009. Flag their economic interpretation; do not delete, cap, winsorize, or replace them in the primary history merely because they distort the mean. An optional sensitivity view may show a clearly defined alternative, with excluded dates and counts disclosed.

Do not interpolate missing PER/PBR, backfill before actual source coverage, or forward fill observations across missing months to make a continuous chart. Missingness must remain visible. If a provider itself publishes interpolated financial inputs, preserve that methodology flag and do not describe the resulting series as independently observed monthly fundamentals.

## 9. Build monthly histories and annual comparison tables

The requested data coverage starts in January 2000 and ends with the last completed calendar month before the selected cutoff. For each selected current observation, set `reference_end_month = min(month_before(current_observation_period), last_completed_month_at_cutoff)`. This excludes the current observation's month as well as any later observations from its own reference population. A daily October 2026 value is compared with January 2000 through September 2026, at most 321 months. If the latest value is a September month-end observation, compare it with January 2000 through August 2026, at most 320 months, and label the position as belonging to that September observation. Maintain requested history coverage and reference-sample coverage separately. Never improve freshness by moving the reference endpoint backward; freshness is measured against expected source observations and publication lags at the effective cutoff.

Preserve each source's frequency and date meaning. For a genuine daily closing series, choose the actual final valid trading session of each month only if the source has the expected closing observation. If the final observation is missing, mark that month missing or explicitly partial; do not silently select an older day as month end. For provider published monthly averages, retain monthly average semantics. For quarterly observations, do not replicate each quarter three times and call it a monthly history.

Provide annual tables from 2000 through the effective cutoff year, with all four primary indices and separate PER/PBR columns. Missing cells remain visible with reason codes. Let users choose year end observations or annual means of eligible monthly observations; these are distinct calculations. Annual means require their observation counts and coverage. The cutoff year must be labeled year to date or current snapshot, never an invented future year end. A future requested date capped to the current time must not generate future annual rows.

An annual table containing a January labeled value must not silently equate it with a December year end value. Preserve original labels and explain conversions. Do not shift a Shiller monthly average into a fabricated daily closing observation.

Show actual coverage start, last observation, expected month count, observed month count, usable numeric month count, missing months, not meaningful months, and methodology breaks for every series. Offer a downloadable coverage report.

## 10. Exact historical statistics and qualification rules

Use the same calculation module everywhere. For current value `x` and a historical numeric sample of size `N`, calculate the midrank percentile as:

```text
percentile(x) = 100 * (count(value < x) + 0.5 * count(value == x)) / N
```

Use documented decimal precision for equality, rather than display rounding. Quantiles use Hyndman–Fan type 7 interpolation: for sorted values and probability `p`, use zero based position `(N - 1) * p`, interpolating between adjacent observations. Report sample size, minimum and date, maximum and date, mean, median, and P10/P25/P75/P90. If multiple dates share an extreme, preserve the dates or disclose their count.

Provide separate windows: since January 2000, trailing 10 years, and trailing 5 years, ending at the observation-specific reference endpoint defined above. The trailing windows mean the corresponding 120 or 60 calendar months; do not expand backward to obtain enough valid observations. Show the actual endpoints and keep the requested target coverage visible separately.

The following are application policies, not universal statistical laws. A named window may receive a qualified historical position label only if:

- There are at least 48 usable numeric monthly observations.
- Usable numeric months cover at least 80% of expected months in that window.
- Observed months, including explicit not meaningful states, cover at least 95% of expected months.
- The requested start is actually covered, not preceded by an unobserved portion.
- There is no unverified methodology break or incompatible source splice.
- The current metric and reference distribution have compatible definitions and acceptable freshness.

An explicit source record saying a month's ratio is not meaningful counts as observed but not numeric. An inferred missing row does not count as observed. Keep these counts separate. Also disclose the longest missing run, concentration of missing months in crisis periods, and methodology breaks. Never shrink an expected window to improve coverage. Unknown defining fields permit descriptive source-native readings but not a qualified historical label or a compatible cross-market calculation.

Maintain `within_series_comparability` separately from `cross_series_comparability`. Define the essential fields for each check in the registry; not every optional metadata field must be filled. Unknown equals unknown is not evidence of compatibility. Unresolved rejected source rows have a separate `sourced_but_rejected` count, and an unresolved current-value conflict blocks qualification. State that the percentile distribution is conditional on eligible positive multiples, and show excluded not-meaningful and loss-period shares.

With at least two valid observations, descriptive statistics may still be shown when qualification fails. Label them partial history with the actual start, coverage, and failure reason. Never rename a 2010 onward sample “since 2000.” Below two observations show insufficient history. A spot value against a monthly average distribution is descriptive only and must disclose that mismatch. A spot value against monthly closing observations must be described as the spot's position within the monthly closing distribution.

Use five labels only after the qualification gate: below 10th percentile, historically low; 10 to below 30, lower range; 30 to below 70, middle range; 70 to below 90, higher range; 90 or above, extreme upper range. Use neutral Korean equivalents and show the percentile. None of these labels means buy, hold, sell, expected return, or probability of a market decline.

## 11. Relative comparisons and scenario mathematics

Enable a ratio discount only when both observations are positive, definitions and aggregation are compatible, source dates are aligned, and publication constraints are satisfied:

Set the temporal matching rule explicitly to either `exact_observation_date` or `same_calendar_month_final_local_session`. The latter permits different actual local month-end dates caused by holidays, with both dates and non-simultaneous closes shown. It is not permission to forward fill missing expected observations. Publication constraints follow the selected knowledge/vintage mode defined above.

```text
discount_of_A_to_B_percent = 100 * (1 - ratio_A / ratio_B)
```

A negative result is a premium. Show the direction in the label. For historical relative percentiles use the intersection of genuinely matched observations and disclose lost coverage. If one series is FY0 and another TTM, or one excludes losses differently, show the individual readings but disable the quantified discount with an explanation. Different sector composition still limits the interpretation of a technically comparable discount.

Provide an optional three year scenario panel with editable assumptions, clearly marked as user scenarios. For a compatible earnings and PER basis:

```text
terminal_price / initial_price =
  (terminal_EPS / initial_EPS) * (terminal_PE / initial_PE)
price_return = terminal_price / initial_price - 1
```

For a PBR scenario use book value per share growth and the PBR change instead. These are alternative decompositions of price return; do not multiply or add the PER and PBR scenario returns together. Define whether EPS growth is cumulative or annualized. Do not mix NTM starting earnings with a differently defined terminal earnings period.

Keep price return separate from dividends, fees, taxes, and FX. If dividends are included, state whether they are accumulated cash without reinvestment or modeled with a defined reinvestment path. For KRW investor returns on a USD asset use `(1 + USD asset return) * (ending KRW per USD / starting KRW per USD) - 1`. Do not reverse the currency convention.

CAPE is a separate supplement, not a substitute for missing PER. Discuss earnings cyclicality, sector weights, buybacks, intangible assets, and financial reporting differences. PBR/PER may imply an earnings to book relationship only when numerator, denominator, period, and universe are aligned; do not label it reported ROE without that verification.

## 12. Interface and analytical views

Create a responsive, keyboard accessible interface with these core views:

1. **Overview:** four index cards showing ratio, exact basis, observation date, price date, financial date, current estimate flag, source, and freshness. Include the historical position only when eligible.
2. **History:** synchronized PER and PBR charts with selectable windows, median and quantile bands, visible gaps, crisis annotations, methodology breaks, and a distinct current marker. Avoid misleading dual axes and connect neither missing periods nor incompatible series.
3. **Annual comparison:** year end or annual mean table, coverage indicators, sorting, and export.
4. **Relative comparison:** compatible pairs with the direction of discount, common sample coverage, and disabled states for incomparable definitions.
5. **Scenario analysis:** editable assumptions, formula explanations, price return, optional dividends and KRW conversion.
6. **Data and methodology:** source registry, actual coverage, definitions, permissions, unresolved conflicts, and source health.

Use direct Korean status text such as 자료 없음, 산식 미확인, 최신 공표 대기, 과거 자료 부족, and 출처 확인 필요. Do not render missing values as zero or color them as bargains. Keep a visible run history and last successful observation date. A successful HTTP fetch must not make unchanged old data appear fresh.

Include a dry run and preview for imports or backfills, showing proposed inserts, revisions, conflicts, and rejected rows before promotion. Provide sensible defaults without requiring the investor to understand database internals.

## 13. APIs, exports, and snapshot consistency

Expose typed, authenticated routes appropriate to the existing stack. Suggested responsibilities are index and series discovery, current snapshot, historical observations, annual aggregates, historical statistics, relative comparisons, scenario calculations, coverage, source health, and ingestion administration. Keep exact route names consistent in application documentation.

Every analytical response should include a snapshot ID, effective cutoff, selected series IDs, methodology version, calculation version, vintage mode, coverage, and qualification status. Pagination and date filters must be explicit. Use bounded queries and caching keyed by dataset revision and relevant filters; invalidate when data or methodology changes.

Export UTF-8 CSV with Korean compatible encoding options and a metadata JSON companion. Exports must retain actual dates, series definitions, missing status, source attribution, estimate flags, coverage, selected filters, and snapshot ID. Respect per provider export permissions. Charts, table cells, cards, and exports for one snapshot must agree exactly before presentation rounding.

Do not make public share links by default. Use existing authentication or a suitable private access mechanism, protect administrative routes, and keep provider secrets on the server. A local demonstration without credentials should expose honest empty states and authorized import tools rather than an apparent live dataset.

## 14. Scheduled ingestion and operational behavior

Default intended refresh times are 07:30 and 18:00 Asia/Seoul. These correspond to 22:30 UTC on the preceding date and 09:00 UTC. If the scheduler accepts UTC cron, document the date conversion; if it supports IANA timezones, use Asia/Seoul directly. US market close times still depend on America/New_York daylight saving rules.

Verify the hosting plan's actual scheduler and execution limits. If two daily runs are unsupported, implement a documented feasible option, such as one daily refresh plus manual refresh, without silently changing the intended schedule or purchasing an upgrade. Do not create unrelated external notifications.

Each run should discover expected completed sessions, request only relevant observations, honor provider publication lag, validate responses, write idempotently, and update source health. A holiday is not an outage. Separate “no new publication yet” from request failure and from an unavailable metric.

Use bounded retries with exponential backoff, rate limit awareness, a concurrency lock, and resumable checkpoints. Keep last attempt, last success, latest observed date, unchanged response count, and failure reason. A failed source must not erase the last valid dataset. Display retained data as stale when its source specific freshness policy requires it.

## 15. Import and application security

Validate file size, row count, encoding, delimiter, date format, allowed index/metric IDs, and numeric fields. Provide a mapping preview and reject ambiguous date formats. Do not execute spreadsheet formulas or macros. Protect exported text against CSV formula injection while preserving numeric financial fields correctly.

Restrict provider request destinations to configured, verified hosts. Do not fetch arbitrary URLs supplied in CSV cells or query parameters. Validate redirects to prevent SSRF. Keep credentials out of browser bundles, logs, error messages, exports, and repository history. Use parameterized SQL, authenticated administration, appropriate CSRF protection, and safe error responses.

Separate test fixtures from live data physically or by an enforced environment boundary. Never load synthetic observations into the production dataset. A demo mode must have a persistent visible fixture label, separate exports, and no live market claims.

## 16. Meaningful verification requirements

Write focused tests that protect financial correctness and the actual data flow. Required cases include:

- `[10, 20, 20, 40]` compared with `20` produces a midrank percentile of exactly `50`.
- Type 7 quantiles, empty samples, one observation, ties, and values outside the sample range behave as documented.
- Cumulative EPS growth of 20% combined with a 25% lower PER produces a price return of negative 10%.
- A 20% earnings decline with an unchanged PER produces negative 20%; a lower valuation multiple cannot itself compensate for falling earnings in the price identity.
- PBR and PER scenarios remain alternative calculations; FX uses KRW per USD in the correct direction.
- A nonpositive denominator becomes not meaningful, a documented zero sentinel becomes null, and a legitimate high positive 2009 PER remains in the primary distribution.
- The incomplete current month is excluded; quarterly values are not duplicated into monthly observations; missing final session data is not silently turned into month end.
- January labeled observations are not treated as December year end; US daylight saving, Korean morning cutoffs, holidays, and the fixed reference cutoff select the correct completed sessions.
- Historical publication uncertainty blocks strict point in time claims; source native unknown basis displays without enabling incompatible comparisons.
- Coverage gates use expected, observed, and numeric months correctly; partial history never receives a since 2000 qualified label.
- Same series conflicts are quarantined; distinct methodologies remain distinct; revised observations preserve reproducible previous snapshots.
- A successful fetch of old observations does not reset observation freshness, and a failed run preserves the last valid dataset.
- A provider-published TTM ratio with prior-quarter financial data remains provider-reported; an application price roll-forward is classified as an application estimate.
- With an October 23 cutoff and a September current observation, the reference sample ends in August with at most 320 since-2000 months, while requested coverage remains through September with 321 months.
- In a 60-month window, 48 numeric observations plus 9 explicit provider N/M records and 3 missing months yield 95% observed coverage and 80% eligible coverage. Forty-eight numeric observations plus 12 app-generated missing rows yield 80% observed coverage, not 100%.
- Two unknown definitions cannot pass a compatibility gate; post-cutoff historical revisions are excluded from strict as-known mode and may appear only in the labeled current-vintage descriptive view.
- Different local month-end trading dates can match by the explicit month-end rule, and a 2027 live run produces 2000-2026 completed-year rows plus 2027 YTD.
- Cards, charts, API responses, annual tables, and exports agree for one snapshot and filter set.
- Imports reject malformed records and formula injection, enforce authorization and permissions, and never expose credentials or allow arbitrary network fetches.

Run integration tests against an isolated database. Complete a browser flow that imports a permitted sample or retrieves a genuinely accessible provider, creates a snapshot, renders the overview and historical table, changes filters, and exports matching data and metadata. State whether the input was live, user imported, or a fixture. Do not describe a fixture only browser test as proof that live provider integration works.

## 17. Build phases and completion evidence

Work in practical increments: repository inspection and source feasibility; data contracts and migrations; one end to end verified ingestion or import path; statistics and snapshots; Korean interface and exports; scheduling and operational states; targeted tests and browser verification.

Continue with useful development when some sources are blocked. Maintain a capability matrix distinguishing live verified, authorized upload verified, implemented but unconfigured, unsupported, and fixture only. “All four indices supported in the interface” must not become a claim that complete 2000 onward valuation history has been obtained.

At completion provide the implemented files and run instructions, environment variable names without secrets, migrations, calculation policy, source capability matrix, coverage results, tests actually run, browser verification evidence, unresolved data requirements, and deployment readiness. State exactly which user supplied credentials or licensed exports would unlock missing coverage. Do not claim deployment or successful automation unless those actions were authorized and actually verified.

## 18. Verified starting references and limits

Recheck these sources at implementation time. They are discovery anchors, not promises of free APIs or complete history:

- S&P 500 official overview: https://www.spglobal.com/spdji/en/indices/equity/sp-500/
- S&P index mathematics: https://www.spglobal.com/spdji/en/documents/methodologies/methodology-index-math.pdf — check product scope; the Global EOM fundamentals section explicitly distinguishes the U.S. Fundamental Data Package.
- Nasdaq Composite official registry: https://indexes.nasdaqomx.com/Index/Overview/COMP
- Nasdaq-100 official registry: https://indexes.nasdaqomx.com/Index/Overview/NDX
- Nasdaq data services: https://www.nasdaq.com/products/global-indexes/data — verify exact fields, history, entitlements, and permissions.
- KRX Data Marketplace: https://data.krx.co.kr/ — verify the exact investment indicator dataset and export definitions.
- KRX Open API: https://openapi.krx.co.kr/ — inspect actual available services; index prices and valuation fundamentals are separate capabilities.
- Shiller data: https://shillerdata.com/ and https://www.econ.yale.edu/~shiller/data.htm — monthly average prices and interpolated financial inputs require explicit labeling.
- Multpl PER: https://www.multpl.com/s-p-500-pe-ratio/table/by-year
- Multpl PBR: https://www.multpl.com/s-p-500-price-to-book/table/by-year — annual date conventions differ from the PER table; inspect current estimate and denominator dates.

Do not seed production with the market numbers in an earlier memo or this project's example documentation. Production values must arrive through a verified, attributed, permission compatible data path.
