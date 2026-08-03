# CyberSentinel AI — Changelog

All notable changes to CyberSentinel AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] - 2026-08-03

### Added
- **Cookie Security Analysis Module (`CookieScanner`)**:
  - Layer 7 response cookie inspection over HTTP/HTTPS.
  - Intelligent cookie classifier separating cookies into `Authentication` (1.0 weight), `Session` (0.8), `Tracking` (0.4), `Analytics` (0.2), `Functional` (0.1), and `Unknown` (0.5).
  - Weighted Risk Scoring engine preventing analytics cookies (`_ga`) from artificially inflating the risk score.
  - Score Breakdown accordion listing exact point additions comprising the total Cookie Risk Score.
  - Cookie Grouping / Deduplication displaying consolidated rows with count badges (e.g. `__cf_bm (2)`).
  - Permanent Finding IDs (`CK-001` to `CK-006`).
  - 7-Metric KPI Summary Card at top of `CookiesTab.tsx`.
- **HTTP Headers Disambiguation (Phase 5.1)**:
  - Added `Content-Security-Policy-Report-Only` detection (`Report Only` blue badge) preventing false positive missing CSP alerts on sites like Google.
- **Dynamic Module Counter**:
  - Dynamic `completed_modules` / `total_modules` counter tracking **5 / 5** active scanner modules (`DNS`, `WHOIS`, `SSL`, `Headers`, `Cookies`).

### Changed
- Refactored `reportUtils.ts` to aggregate findings from 5 modules into Nessus-style reports.
- Updated `ReportHeader.tsx` to include `Cookies` tab with observation count badge.

### Fixed
- Fixed Bandit B501 security vulnerability by removing `verify=False` from `httpx.AsyncClient` calls across all scanner modules.
- Cleaned up unused imports across frontend components ensuring 0 ESLint warnings and 0 TypeScript errors.

### Security
- Standard secure TLS certificate validation enforced on all outgoing scanner HTTP requests. Zero `#nosec` suppressions.

---

## [1.5.0] - 2026-08-02

### Added
- **HTTP Security Headers Scanner (`HeadersScanner`)**:
  - Inspects 11 browser defensive headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, COEP, CORP, Server, X-Powered-By).
  - Mounted `HeadersTab.tsx` with filterable raw header table and copy buttons.

---

## [1.4.0] - 2026-08-01

### Added
- **SSL/TLS Security Scanner (`SSLScanner`)**:
  - Non-blocking TLS socket parser extracting Subject CN, Issuer, Serial Number, Expiration Days, Protocol Version, Cipher Suite, and DER `signature_algorithm` OID.
  - Mounted `SslTab.tsx` visualization tab.

---

## [1.2.0] - 2026-07-31

### Added
- **DNS & WHOIS Intelligence Modules**:
  - `DNSScanner` resolving A, AAAA, MX, NS, TXT, CNAME, SPF/DMARC records.
  - `WHOISScanner` querying TLD registrars for domain age, creation date, and registry expiry.
  - Mounted `DnsTab.tsx` and `WhoisTab.tsx`.

---

## [1.0.0] - 2026-07-30

### Added
- Initial project release featuring FastAPI backend, Next.js frontend, PostgreSQL database integration, and JWT authentication.
