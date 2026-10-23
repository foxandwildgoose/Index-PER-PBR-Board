# Calculation policy

Version `calc-2026.10.1`. Equality is exact at 8 decimal places, half away from zero. Display rounds to 2 places for ratios and 1 for percents and is never used for equality or quantiles.

Percentile is the midrank: `100 * (count(value < x) + 0.5 * count(value == x)) / N`.

Quantiles are Hyndman–Fan type 7: position `(N - 1) * p`.

A month is in the reference sample only through `min(month before the current observation, last completed month at the cutoff)`. An October 2026 spot uses January 2000–September 2026 (321 months). A September month-end observation uses January 2000–August 2026 (320) while requested coverage still runs through September.

Trailing 10- and 5-year windows are 120 and 60 calendar months ending at that reference month. They are not stretched backward to fill gaps.

Qualified labels require 48 numeric months, 80% numeric coverage, 95% observed coverage, the requested start actually present, no methodology break, known comparable definitions, and acceptable freshness. Explicit not-meaningful rows count as observed. App-inferred gaps do not. Unknown equals unknown is not compatibility.

Labels, only after that gate: 역사적 낮은 구간, 낮은 구간, 중간 구간, 높은 구간, 역사적 상위 구간. None is a trade instruction.

Strict as-known needs `point_in_time` and a publication time. A date-only publication counts only when that date is strictly before the valuation cutoff's Seoul date. Later revisions can appear in the current-vintage view, which is never labeled as-known.

Price identity: `(terminal earnings / initial) * (terminal multiple / initial) - 1`. PER and PBR paths are alternatives. KRW investor return uses KRW per USD: `(1 + USD return) * (end / start) - 1`.

Nonpositive denominators are not meaningful. A documented zero sentinel becomes missing, not a bargain. Large positive crisis multiples stay in the primary distribution.
