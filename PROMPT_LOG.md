# Prompt Log — MaskMate Development

This log records the prompts, instructions, and outcomes during the design, implementation, and testing of **MaskMate**.

---

### Prompt 1
- **Date**: 2026-11-27
- **Prompt**:
  > You are a senior full-stack engineer. Build a complete, working, browser-only PII sanitization web app called "MaskMate". Everything must run 100% client-side. No backend, no analytics, no external API calls, no CDN scripts or fonts at runtime. Add a strict Content-Security-Policy meta tag (connect-src 'none') and show a visible "Processed locally. Nothing leaves your browser" badge in the UI.
  > 
  > Tech stack: Vite + React + TypeScript + Tailwind CSS. Use Vitest for unit tests. Keep dependencies minimal (no PII or NLP libraries; write the detection engine yourself).
  > 
  > Core functionality:
  > 1. Input: textarea, file upload (.txt, .csv), Load Sample Noisy Text button, Clear button.
  > 2. Detection engine (src/lib/detectors.ts, pure functions): EMAIL, PHONE, IP (v4 octet 0-255 & v6), PAN (holder-type code), AADHAAR (Verhoeff checksum), CREDIT_CARD (Luhn algorithm & rejection count). Deterministic overlap resolution.
  > 3. Three redaction modes: FULL MASK, PARTIAL MASK, CONSISTENT PSEUDONYMIZATION with registry table and privacy toggle.
  > 4. Audit & diff view: side-by-side synchronized scrolling diff with color-blind accessible highlights, audit panel with latency and rejected bait counters.
  > 5. Export: Download Sanitized File (.txt or .csv), Copy to clipboard, Download Audit Report (JSON) with zero raw PII.
  > 6. UX / design: polished dark theme, accessible, mobile responsive, CSP meta tag.
  > 7. Tests, README.md, and PROMPT_LOG.md.

- **Outcome**:
  - Scaffolded Vite + React 19 + TypeScript + Tailwind CSS + Vitest.
  - Configured strict CSP meta tag (`connect-src 'none'`) in `index.html`.
  - Implemented `validators.ts` with pure Luhn (mod 10), Verhoeff checksum algorithm with dihedral permutation tables, PAN holder-code validation, and IPv4/IPv6 address validators.
  - Implemented `overlap.ts` with deterministic priority queue (`CREDIT_CARD > AADHAAR > PAN > EMAIL > IP > PHONE`).
  - Implemented `detectors.ts` with false-positive guardrails (rejecting order IDs and timestamps).
  - Implemented `redactors.ts` for Full Mask, Partial Mask, and Consistent Pseudonymization.
  - Created 20 comprehensive Vitest unit tests covering all checksums, detectors, edge cases, bait rejections, and pseudonymization consistency.
  - Built modular React UI components (`InputPanel`, `ModeSelector`, `DiffView`, `AuditPanel`, `MappingTable`, `ExportBar`).
  - Executed test suite (20/20 passing) and production build (`npm run build`). Verified client-side execution with zero external requests.

