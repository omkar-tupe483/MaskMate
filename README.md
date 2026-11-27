# MaskMate

**MaskMate** is a 100% client-side PII detection and sanitization web application built with Vite, React, TypeScript, and Tailwind CSS. All scanning, checksum validation, redaction, and exports execute locally inside the browser with zero backend or external network dependencies.

---

## Privacy Model

- **100% Offline Execution**: Visible privacy badge (`100% offline • your data never leaves this device`) in the sticky header.
- **Strict Content Security Policy**: `index.html` enforces `connect-src 'none'`, `default-src 'self'`, `object-src 'none'`, and `form-action 'none'`.
- **Zero External Assets**: No external API calls, analytics, CDN scripts, CDN fonts, or external image/video files (pure inline SVG + CSS only).
- **Local Exports**: Sanitized `.txt` / `.csv` files and optional Pseudonym Map JSON exports are generated strictly in memory using `Blob` and `URL.createObjectURL`.

---

## Supported Formats & Detection Engine

- **Input**: Direct text paste plus drag-and-drop or button upload for `.txt` and `.csv` files (up to **5 MB** via `FileReader`).
- **CSV Preservation**: RFC 4180 parser/serializer in `src/lib/csv.ts` redacts inside individual cells while preserving row/column structure, delimiters, and quoting.
- **PII Detectors** (`src/lib/detectors.ts`, `src/lib/luhn.ts`, `src/lib/verhoeff.ts`):
  - `EMAIL` — RFC-practical email regex with word boundaries
  - `PHONE` — Indian (`+91` / `0` prefix, 10 digits starting `6-9`, separators allowed) and international E.164 formats
  - `IP_ADDRESS` — IPv4 (`0-255` octet validation, rejecting bad leading zeros) and full/compressed IPv6
  - `PAN` — `[A-Z]{5}[0-9]{4}[A-Z]` uppercase format
  - `AADHAAR` — 12 digits (`2-9` leading digit, optional `4-4-4` space/hyphen grouping) validated with the **Verhoeff** dihedral checksum
  - `CREDIT_CARD` — 13–19 digits validated with the **Luhn** algorithm plus brand detection (`Visa`, `Mastercard`, `Amex`, `RuPay`, `Discover`)
- **Overlap Resolution**: Deterministic priority order (`CREDIT_CARD > AADHAAR > PAN > EMAIL > IP_ADDRESS > PHONE`), then longest match, preventing double-flagging.

---

## Three Redaction Modes

1. **Full Mask**: `[REDACTED]` or `[REDACTED:EMAIL]` (configurable tag toggle).
2. **Partial Mask**: Preserves verification context (`XXXX-XXXX-XXXX-1234`, `XXXXXX7890`, `j***@gmail.com`, `XXXX-XXXX-9012`, `ABCDE****F`, `192.168.*.*`).
3. **Consistent Pseudonymization**: Normalizes duplicates (lowercase emails/IPs, strip spaces/hyphens from numbers, uppercase PAN) so variants share the same sequential placeholder (`EMAIL_01`, `CARD_01`, etc.). Displays in a collapsible **Pseudonym Map** panel (excluded from sanitized downloads by default, with an optional JSON export).

---

## Onboarding & Interactive Tutorial

- **First-Visit Welcome Gate**: Stored locally under `maskmate.tutorial.v1` in `localStorage` (`try/catch` guarded). Asks `"Do you know how to use MaskMate?"` with 3D-tilting `TiltedCard` choices.
  - **Yes, I know**: Displays a 5-step Quick Summary card with a `"Show the tutorial anyway"` option.
  - **No, teach me**: Launches a 9-step game-style walkthrough (`useTutorial.ts`, `Spotlight.tsx`, `TourTooltip.tsx`, `Confetti.tsx`) with an XP progress bar, SVG spotlight cutout, `ResizeObserver`/scroll tracking, keyboard controls (`←`, `→`, `Enter`, `Esc`), and real action gates on Sample Loading and Redaction Mode switching.
- **Replay Anytime**: Click `? Replay tutorial` in the header to reopen the welcome flow.

---

## How to Run

```bash
# Install dependencies
npm install

# Run unit tests (Node native test runner)
npm test

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Bundle & Project Footprint

- **`dist/` production bundle**: `337.45 KB` (`0.33 MB`) — well under the `2 MB` target.
- **`src/` source files**: `122.4 KB`.
- **`node_modules/`**: `86 MB` (minimal stack: React, React DOM, Vite, TypeScript, Tailwind CSS v4 — no `vitest`, `framer-motion`, `lodash`, `moment`, or icon/UI kit dependencies).

