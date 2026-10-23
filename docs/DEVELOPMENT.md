# Development note

The site extends the existing TanStack Start app instead of starting a Next.js
repository. Postgres is the Neon-compatible database already wired in
`src/lib/db` (PGLite when `DATABASE_URL` is unset). Auth stays off: the
platform's auth middleware would reject every visitor of an app with no
sign-in route. Administrative imports are open only when `INGEST_TOKEN` is
unset, and closed behind that server-only token when it is set.

Financial math lives in `src/lib/valuation` and is shared by cards, charts,
annual rows, and CSV metadata. Observation revisions are append-only. A
changed value quarantines the date instead of overwriting a saved revision.

Live PER/PBR history was not loaded. See `docs/SOURCE_CAPABILITY.md`.

## Run

The preview starts with `npm run dev`. Schema is `migrations/0002_valuation.sql`.

Environment names, never values:

- `DATABASE_URL` — Neon connection, injected on deploy. Empty locally uses PGLite.
- `INGEST_TOKEN` — optional. When set, import and health runs must send it.
- `KRX_API_KEY` — not read. No valuation endpoint was verified, so a key would not unlock ratios.

Intended refresh is 07:30 and 18:00 Asia/Seoul (22:30 UTC previous date and 09:00 UTC). The host cron limit was not verified, so those jobs were not registered. Use the manual status check. A failed check does not delete stored rows.

## Calculation

`docs/CALCULATION_POLICY.md`.
