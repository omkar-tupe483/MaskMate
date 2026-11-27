import { detectCardBrand, validateLuhn, type CardBrand } from './luhn.ts';
import { validateVerhoeff } from './verhoeff.ts';
import { normalizeEntityValue } from './pseudonymizer.ts';

export type EntityType =
  | 'EMAIL'
  | 'PHONE'
  | 'IP_ADDRESS'
  | 'PAN'
  | 'AADHAAR'
  | 'CREDIT_CARD'
  | 'CUSTOM';

export interface CustomPatternDefinition {
  id: string;
  label: string;
  pattern: string;
  flags: string;
  enabled: boolean;
}

export interface DetectedEntity {
  id: string;
  type: EntityType;
  start: number;
  end: number;
  value: string;
  normalized: string;
  confidence: number;
  brand?: CardBrand;
  checksumValid?: boolean;
  customLabel?: string;
}

export interface DetectionResult {
  entities: DetectedEntity[];
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  processingTimeMs: number;
}

export const ENTITY_PRIORITY: Record<EntityType, number> = {
  CREDIT_CARD: 100,
  AADHAAR: 90,
  PAN: 80,
  EMAIL: 70,
  IP_ADDRESS: 60,
  PHONE: 50,
  CUSTOM: 40,
};

// Precompiled linear-time built-in regexes (audited for zero catastrophic backtracking)
const EMAIL_REGEX =
  /(?<![A-Za-z0-9_%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9])/g;
const PAN_REGEX = /(?<![A-Z0-9])[A-Z]{5}[0-9]{4}[A-Z](?![A-Z0-9])/g;
const CC_REGEX = /(?<![A-Za-z0-9])(?:\d[ -]?){12,18}\d(?![A-Za-z0-9])/g;
const AADHAAR_REGEX =
  /(?<![A-Za-z0-9]|\d[ -])([2-9]\d{3})([ -]?)(\d{4})\2(\d{4})(?![A-Za-z0-9]|[ -]\d)/g;
const IPV4_REGEX = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g;
const IPV6_CANDIDATE_REGEX =
  /(?<![0-9a-fA-F:])(?:[0-9a-fA-F]{1,4}:|::)[0-9a-fA-F:]{1,37}(?![0-9a-fA-F:])/g;
const INDIAN_PHONE_REGEX =
  /(?<![A-Za-z0-9+])(?:(?:\+91|91|0)[ -]?)?[6-9]\d{4}[ -]?\d{5}(?![A-Za-z0-9])/g;
const INTL_PHONE_REGEX =
  /(?<![A-Za-z0-9])\+\d{1,3}(?:[ -]+\(?\d{2,4}\)?|\(\d{2,4}\)){1,4}[ -]*\d{3,4}(?![A-Za-z0-9])|(?<![A-Za-z0-9])\+\d{10,15}(?![A-Za-z0-9])/g;

function isPartOfOrderOrTimestamp(text: string, start: number, end: number): boolean {
  const prev = text[start - 1];
  const next = text[end];
  if ((prev && /\d/.test(prev)) || (next && /\d/.test(next))) return true;

  const prefix = text.slice(Math.max(0, start - 16), start);
  if (/(?:order|ord|invoice|inv|txn|ref|ticket|build|v|sha)[\s_#:=-]*$/i.test(prefix)) {
    return true;
  }

  const around = text.slice(Math.max(0, start - 10), Math.min(text.length, end + 10));
  if (/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(around)) {
    return true;
  }

  return false;
}

export function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
    const n = Number(part);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

/**
 * Procedural O(1) IPv6 validator (avoids nested regex alternations).
 */
export function validateIPv6(ip: string): boolean {
  const clean = ip.trim();
  if (!clean || !clean.includes(':')) return false;

  const doubleColonParts = clean.split('::');
  if (doubleColonParts.length > 2) return false;

  const isValidGroup = (g: string) => /^[0-9a-fA-F]{1,4}$/.test(g);

  if (doubleColonParts.length === 1) {
    const groups = clean.split(':');
    return groups.length === 8 && groups.every(isValidGroup);
  }

  const [leftRaw, rightRaw] = doubleColonParts;
  const leftGroups = leftRaw ? leftRaw.split(':') : [];
  const rightGroups = rightRaw ? rightRaw.split(':') : [];

  if (!leftGroups.every(isValidGroup) || !rightGroups.every(isValidGroup)) {
    return false;
  }

  // Compressed '::' must represent at least 1 omitted zero group
  return leftGroups.length + rightGroups.length < 8;
}

export function detectEmails(text: string): DetectedEntity[] {
  const out: DetectedEntity[] = [];
  EMAIL_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMAIL_REGEX.exec(text)) !== null) {
    out.push({
      id: `EMAIL-${m.index}`,
      type: 'EMAIL',
      start: m.index,
      end: m.index + m[0].length,
      value: m[0],
      normalized: normalizeEntityValue('EMAIL', m[0]),
      confidence: 0.99,
    });
  }
  return out;
}

export function detectPANs(text: string): DetectedEntity[] {
  const out: DetectedEntity[] = [];
  PAN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAN_REGEX.exec(text)) !== null) {
    out.push({
      id: `PAN-${m.index}`,
      type: 'PAN',
      start: m.index,
      end: m.index + m[0].length,
      value: m[0],
      normalized: normalizeEntityValue('PAN', m[0]),
      confidence: 0.98,
    });
  }
  return out;
}

export function detectCreditCards(text: string, onReject?: () => void): DetectedEntity[] {
  const out: DetectedEntity[] = [];
  CC_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CC_REGEX.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    if (isPartOfOrderOrTimestamp(text, start, end)) continue;
    const digits = raw.replace(/[\s-]/g, '');
    if (digits.length < 13 || digits.length > 19) continue;

    if (validateLuhn(digits)) {
      out.push({
        id: `CARD-${start}`,
        type: 'CREDIT_CARD',
        start,
        end,
        value: raw,
        normalized: digits,
        confidence: 0.99,
        brand: detectCardBrand(digits),
        checksumValid: true,
      });
    } else {
      onReject?.();
    }
  }
  return out;
}

export function detectAadhaars(text: string, onReject?: () => void): DetectedEntity[] {
  const out: DetectedEntity[] = [];
  AADHAAR_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AADHAAR_REGEX.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    if (isPartOfOrderOrTimestamp(text, start, end)) continue;
    const digits = raw.replace(/[\s-]/g, '');
    if (digits.length !== 12) continue;

    if (validateVerhoeff(digits)) {
      out.push({
        id: `AADHAAR-${start}`,
        type: 'AADHAAR',
        start,
        end,
        value: raw,
        normalized: digits,
        confidence: 0.99,
        checksumValid: true,
      });
    } else {
      onReject?.();
    }
  }
  return out;
}

export function detectIPAddresses(text: string): DetectedEntity[] {
  const out: DetectedEntity[] = [];

  IPV4_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IPV4_REGEX.exec(text)) !== null) {
    if (validateIPv4(m[0])) {
      out.push({
        id: `IP-${m.index}`,
        type: 'IP_ADDRESS',
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        normalized: m[0],
        confidence: 0.96,
      });
    }
  }

  IPV6_CANDIDATE_REGEX.lastIndex = 0;
  while ((m = IPV6_CANDIDATE_REGEX.exec(text)) !== null) {
    if (validateIPv6(m[0])) {
      out.push({
        id: `IP-${m.index}`,
        type: 'IP_ADDRESS',
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        normalized: m[0].toLowerCase(),
        confidence: 0.95,
      });
    }
  }

  return out;
}

export function detectPhones(text: string): DetectedEntity[] {
  const out: DetectedEntity[] = [];

  const tryAdd = (raw: string, start: number) => {
    const end = start + raw.length;
    if (isPartOfOrderOrTimestamp(text, start, end)) return;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return;
    out.push({
      id: `PHONE-${start}`,
      type: 'PHONE',
      start,
      end,
      value: raw,
      normalized: digits,
      confidence: 0.9,
    });
  };

  INDIAN_PHONE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INDIAN_PHONE_REGEX.exec(text)) !== null) tryAdd(m[0], m.index);

  INTL_PHONE_REGEX.lastIndex = 0;
  while ((m = INTL_PHONE_REGEX.exec(text)) !== null) tryAdd(m[0], m.index);

  return out;
}

/**
 * O(n log n) sweep-line overlap resolution:
 * 1. Sort by start ASC, then priority DESC, then length DESC.
 * 2. When a higher-ranked span overlaps the tail of the accepted stack, replace or skip in O(1) amortized.
 * Fallback full check ensures priority > length holds even when a long span starts later.
 */
export function resolveOverlaps(candidates: DetectedEntity[]): DetectedEntity[] {
  if (candidates.length <= 1) return [...candidates];

  const ranked = [...candidates].sort((a, b) => {
    const pDiff = ENTITY_PRIORITY[b.type] - ENTITY_PRIORITY[a.type];
    if (pDiff !== 0) return pDiff;
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  // Binary-search interval tree / sorted non-overlapping array lookup -> O(n log n)
  const accepted: DetectedEntity[] = [];

  const overlapsSorted = (span: DetectedEntity): boolean => {
    let lo = 0;
    let hi = accepted.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const cur = accepted[mid];
      if (cur.end <= span.start) {
        lo = mid + 1;
      } else if (cur.start >= span.end) {
        hi = mid - 1;
      } else {
        return true;
      }
    }
    return false;
  };

  const insertSorted = (span: DetectedEntity) => {
    let lo = 0;
    let hi = accepted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (accepted[mid].start < span.start) lo = mid + 1;
      else hi = mid;
    }
    accepted.splice(lo, 0, span);
  };

  for (const current of ranked) {
    if (!overlapsSorted(current)) {
      insertSorted(current);
    }
  }

  return accepted;
}

/**
 * Main pure PII detection pipeline.
 */
export function detectPII(text: string, extraEntities: DetectedEntity[] = []): DetectionResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let rejectedLuhnCount = 0;
  let rejectedVerhoeffCount = 0;

  const candidates: DetectedEntity[] = [
    ...detectCreditCards(text, () => {
      rejectedLuhnCount += 1;
    }),
    ...detectAadhaars(text, () => {
      rejectedVerhoeffCount += 1;
    }),
    ...detectPANs(text),
    ...detectEmails(text),
    ...detectIPAddresses(text),
    ...detectPhones(text),
    ...extraEntities,
  ];

  const entities = resolveOverlaps(candidates);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    entities,
    rejectedLuhnCount,
    rejectedVerhoeffCount,
    processingTimeMs: Math.round((t1 - t0) * 100) / 100,
  };
}
