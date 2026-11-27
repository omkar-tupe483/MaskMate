# Prompt Log — MaskMate

## Prompt 1 (2026-11-27)

> Build "MaskMate", a complete, production-quality, 100% client-side PII sanitization web app (Vite + React + TypeScript + Tailwind CSS, strict privacy badge, <2 MB dist, <10 MB lean footprint where practical, no backend/analytics/CDNs, input/CSV upload up to 5 MB, sample noisy text with Luhn decoys, pure detection engine with Luhn & Verhoeff & IPv4/IPv6 & PAN & Indian/intl phone & email, 3 redaction modes with consistent pseudonymization & collapsible Pseudonym Map, side-by-side synced hover diff, audit dashboard with bar breakdown & toggles, dark/light theme, onboarding welcome gate + Quick Summary + 9-step interactive spotlight walkthrough with TiltedCard & Confetti & action gates, tests, README.md, and PROMPT_LOG.md).

## Key Engineering Decisions

1. **Zero-Bloat Stack & Native Test Runner**:
   - Used only `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, and `typescript` (omitting `vitest`, `framer-motion`, `lucide-react`, `lodash`, and UI kits).
   - Executed `src/tests/detectors.test.ts` directly with Node v26 built-in `node --test` + `node:assert/strict` and `.ts` import extensions (`allowImportingTsExtensions: true`), keeping `dist/` at `337.45 KB` (`0.33 MB`) and avoiding test-runner bloat in `node_modules`.
2. **Overlap Resolution & Boundary Lookarounds**:
   - Ranked entity candidates deterministically by priority (`CREDIT_CARD > AADHAAR > PAN > EMAIL > IP_ADDRESS > PHONE`), then match length, then start offset.
   - Added negative digit/separator lookarounds on `AADHAAR` (`(?<![A-Za-z0-9]|\d[ -])...(?![A-Za-z0-9]|[ -]\d)`) so leading 12 digits of 16-digit credit cards never trigger false Verhoeff rejections, and relaxed trailing punctuation lookahead on `EMAIL` so sentence-ending periods don't prevent detection.
3. **Pseudonym Normalization & CSV Structure Preservation**:
   - `normalizeEntityValue` lowercases emails/IPs, strips spaces/hyphens from phones/Aadhaar/cards, and uppercases PANs before map lookup.
   - `src/lib/csv.ts` parses RFC 4180 CSV cells, shares one `Pseudonymizer` instance across all cells, redacts within cells without breaking delimiters/quoting, and maps offsets accurately for the side-by-side diff.
4. **Tutorial Gating & Spotlight Cutout Clickability**:
   - `Spotlight.tsx` combines an SVG mask cutout with 4-quadrant outer pointer blockers around `getBoundingClientRect()` so targets like `"Load Sample Noisy Text"` and `"Redaction Mode"` stay genuinely clickable during action-gated steps while clicks outside are blocked.
   - Added responsive fallback centering when a target is unavailable and safe `try/catch` guards around `localStorage`.

## Verification Results

- `npm test` (`node --test src/tests/detectors.test.ts`): **12/12 tests passed** (`0` failures).
- `npm run build` (`tsc -b && vite build`): succeeded cleanly in `1.13s`; `dist/` measured at **`337.45 KB` (`0.33 MB`)**.
- Live `vite preview` server verified responding HTTP `200`, strict CSP `connect-src 'none'` present in `dist/index.html`, and zero external network/font/image URLs in built bundles.

