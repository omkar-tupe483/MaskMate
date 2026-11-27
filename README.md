# MaskMate — Browser-Only PII Sanitizer

MaskMate is a high-performance, **100% client-side** privacy engineering tool that detects and sanitizes Personally Identifiable Information (PII) entirely inside your web browser. 

No data ever leaves your computer: **zero backend, zero telemetry/analytics, zero external API calls, and zero runtime CDN scripts or fonts**. MaskMate enforces this architecture with a strict Content Security Policy (`connect-src 'none'`).

---

## 🔒 Privacy Guarantee & Security Architecture

1. **Content Security Policy (CSP)**:
   ```html
   <meta
     http-equiv="Content-Security-Policy"
     content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none';"
   />
   ```
   The browser will refuse to initiate any outbound HTTP/WebSocket network connections (`connect-src 'none'`).
2. **Local Processing**:
   All file parsing (using HTML5 `FileReader`), detection algorithms, checksum computations, and file exports (`Blob` + `URL.createObjectURL`) execute synchronously in your client environment.
3. **No External PII / NLP Libraries**:
   The detection engine is custom-built with pure mathematical and regex algorithms, minimizing external supply-chain vulnerabilities.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation & Development
```bash
# Clone the repository and navigate into it
cd MaskMate

# Install dependencies
npm install

# Start the development server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## 📐 Architecture Overview

```
src/
├── lib/
│   ├── types.ts          # Entity, EntityType, and detection/redaction interfaces
│   ├── validators.ts     # Pure validation algorithms (Luhn, Verhoeff, PAN, IP)
│   ├── detectors.ts      # Pure regex & algorithmic detectors with boundary guards
│   ├── overlap.ts        # Priority-weighted deterministic overlap resolver
│   ├── redactors.ts      # Redaction logic (Full Mask, Partial Mask, Pseudonymization)
│   └── sample.ts         # Realistic noisy test document with edge cases
├── components/
│   ├── InputPanel.tsx    # Textarea, file drag-and-drop, sample loader
│   ├── ModeSelector.tsx  # Redaction mode switch & per-entity inclusion toggles
│   ├── DiffView.tsx      # Synchronized side-by-side diff with hover highlighting
│   ├── AuditPanel.tsx    # Detection metrics, rejected validation counts, latency
│   ├── MappingTable.tsx  # Pseudonymization mapping registry with privacy toggle
│   └── ExportBar.tsx     # Sanitized file & audit JSON export actions
├── App.tsx               # Root component with debounced state orchestration
├── main.tsx              # Application entry point
└── index.css             # Tailwind CSS & UI theme styles
```

---

## 🛡️ Detection Rules & Validation Matrix

| Entity Type | Pattern / Algorithm | Validation Checksum / Logic | Example Matching Value |
| :--- | :--- | :--- | :--- |
| **CREDIT_CARD** | 13–19 digits (plain, spaced, hyphenated) | **Luhn Checksum (Mod 10)**. Unverified 16-digit strings are rejected and counted as bait. | `4532-0150-1234-5671` |
| **AADHAAR** | 12 digits (4-4-4 spaced/hyphenated), starts 2–9 | **Verhoeff Dihedral Checksum ($D_5$)**. Starting digit 0 or 1 rejected. | `9876-5432-1096` |
| **PAN** | `^[A-Z]{5}[0-9]{4}[A-Z]$` | 4th character must be a valid holder code: `P, C, H, F, A, B, L, J, G, T`. | `ABCPE1234F` (Individual) |
| **EMAIL** | RFC-practical email regex | Valid structure and TLD format. Normalized to lowercase. | `support@healthcare.org` |
| **PHONE** | Indian (+91/0, 10 digits starting 6–9) & International E.164 | Boundary checks ensure order numbers and timestamps are ignored. | `+91 98765 43210` |
| **IP ADDRESS** | IPv4 dotted-decimal & IPv6 (full/compressed) | IPv4 validates each octet is integer $0 \le n \le 255$, disallowing bad leading zeros. | `192.168.1.105`, `fe80::1` |

### Deterministic Overlap Resolution
When multiple patterns match overlapping spans of text, the collision is resolved deterministically:
$$\text{CREDIT\_CARD} > \text{AADHAAR} > \text{PAN} > \text{EMAIL} > \text{IP} > \text{PHONE}$$
If priority is identical, the longest string length match wins. Overlapping or double-flagged entities are never generated.

---

## 🎭 Redaction Modes

1. **Full Mask**:
   Replaces entities with tokens such as `[REDACTED:EMAIL]` or `[REDACTED]`.
2. **Partial Mask**:
   Retains verification context while masking sensitive characters:
   - Credit Card: `XXXX-XXXX-XXXX-5671`
   - Aadhaar: `XXXX-XXXX-1096`
   - PAN: `ABXXXXXX4F`
   - Phone: `+91-XXXXXX4210`
   - Email: `o***@healthcare.org`
   - IP: `192.168.XXX.XXX`
3. **Consistent Pseudonymization**:
   Assigns consistent sequential placeholders (e.g. `EMAIL_01`, `PAN_01`) to normalized values. The same entity (regardless of case or spacing differences) always receives the same pseudonym throughout the document. The UI displays an interactive mapping table with a toggle to hide raw values.

---

## ⚠️ Limitations

- **Heuristic & Regex-Based**: MaskMate uses deterministic regular expressions and mathematical checksums. It does not use heavy NLP / ML models; human names, street addresses, or contextual narrative details without defined numerical/alphanumeric formats are not detected.
- **Form-Field Context**: For unstructured text, phone numbers without international prefixes or standard Indian prefixes might resemble ordinary numbers if not formatted.
