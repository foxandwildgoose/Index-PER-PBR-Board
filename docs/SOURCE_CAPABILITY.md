# Source capability audit

Checked 2026-10-23. This is not a claim that 2000–2026 PER/PBR history was obtained.

| Provider | Status | What was verified | What would unlock coverage |
|---|---|---|---|
| manual_upload | ready | CSV dry-run and commit against an isolated database | A file the user is allowed to store: KRX investment-indicator export, or a licensed S&P / Nasdaq / vendor extract, with the metric id set explicitly |
| krx_openapi | needs credentials, and PER/PBR unsupported | Service list at openapi.krx.co.kr. Index prices from 2010-01-04. PER/PBR are not in the API | Nothing for ratios. A key plus per-API approval would still be prices only, and not back to 2000 |
| krx_marketplace | needs credentials | Login wall. Not bypassed | An authorized export of the index investment-indicator series, then manual_upload |
| spglobal | needs license | Index overview and index-math methodology. U.S. Fundamental Data Package is a separate product. No free historical PER/PBR API response | Licensed index-level fundamental package, or an authorized file |
| nasdaq_data | needs license | Product catalog only. COMP was not replaced with NDX | Licensed Nasdaq Composite valuation history, not NDAQ the stock and not QQQ |
| shiller | manual file only | Yale page describes monthly average price, interpolated earnings, and CAPE. This build does not download the xls | User-exported CAPE rows imported as `CAPE_SHILLER`, labeled monthly average and interpolated. Not a substitute for missing PER |
| multpl | unused | Pages exist. Permission to store or redistribute was not established | A stated license. Until then storage, display, and export stay denied |
| fixture | practice only | Deterministic formula, separate dataset | Nothing. It must not be described as the market |

No adapter invents an endpoint. No production row is a copied memo number.
