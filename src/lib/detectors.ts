import { Entity, EntityType, DetectionResult } from './types.js';
import { validateLuhn, validateVerhoeff, validatePAN, validateIPv4, validateIPv6 } from './validators.js';
import { resolveOverlaps } from './overlap.js';

/**
 * Normalizes values for pseudonymization and deduplication.
 */
export function normalizeEntityValue(type: EntityType, value: string): string {
  switch (type) {
    case 'EMAIL':
      return value.trim().toLowerCase();
    case 'PHONE':
    case 'CREDIT_CARD':
    case 'AADHAAR':
      return value.replace(/[\s-]/g, '').trim();
    case 'PAN':
      return value.trim().toUpperCase();
    case 'IP':
      return value.trim().toLowerCase();
    default:
      return value.trim();
  }
}


/**
 * Helper to test if a string matched as phone/card/aadhaar is actually part of a timestamp,
 * ISO date, order ID, or longer digit sequence.
 */
function isPartOfOrderOrTimestamp(text: string, start: number, end: number): boolean {
  // Check if preceded or followed by digits without space
  const charBefore = text[start - 1];
  const charAfter = text[end];

  if (charBefore && /\d/.test(charBefore)) return true;
  if (charAfter && /\d/.test(charAfter)) return true;

  // Check prefix or suffix indicating order, id, txn, invoice, etc.
  // e.g. "ORD-9876543210", "TXN_123456", "ORDER#9876543210"
  const prefixContext = text.slice(Math.max(0, start - 15), start);
  if (/(?:order|ord|invoice|inv|txn|ref|ticket|build|v|sha)[\s_#:=-]*$/i.test(prefixContext)) {
    return true;
  }

  // Check timestamp like 2026-11-27T10:30:00 or 2026-11-27 10:30:00
  const surroundingContext = text.slice(Math.max(0, start - 10), Math.min(text.length, end + 10));
  if (/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(surroundingContext)) {
    return true;
  }

  return false;
}

/**
 * Credit Card Detector:
 * Matches 13-19 digits formatted with spaces, dashes, or unspaced.
 * Only validates and emits if Luhn algorithm passes.
 * Tracks rejected count for audit.
 */
export function detectCreditCards(
  text: string,
  onReject?: () => void
): Entity[] {
  const entities: Entity[] = [];
  // Regex matching 13 to 19 digits potentially formatted with dashes or spaces
  // Common formats: 4xxx-xxxx-xxxx-xxxx (Visa/Mastercard/Discover), 3xxx-xxxxxx-xxxxx (Amex)
  const ccRegex = /(?<!\w)(?:\d[ -]*?){13,19}(?!\w)/g;

  let match: RegExpExecArray | null;
  while ((match = ccRegex.exec(text)) !== null) {
    const raw = match[0];
    const cleanDigits = raw.replace(/[\s-]/g, '');

    // Skip if it looks like an order ID or part of a timestamp
    if (isPartOfOrderOrTimestamp(text, match.index, match.index + raw.length)) {
      continue;
    }

    if (cleanDigits.length >= 13 && cleanDigits.length <= 19) {
      if (validateLuhn(cleanDigits)) {
        entities.push({
          type: 'CREDIT_CARD',
          start: match.index,
          end: match.index + raw.length,
          value: raw,
          confidence: 0.99,
          normalized: cleanDigits,
        });
      } else {
        // Failed Luhn checksum - count as rejected bait/invalid
        if (onReject) onReject();
      }
    }
  }

  return entities;
}

/**
 * Aadhaar Detector:
 * 12 digits, optionally grouped as 4-4-4 with spaces or hyphens.
 * First digit must be 2-9.
 * Validated strictly using Verhoeff checksum.
 */
export function detectAadhaar(
  text: string,
  onReject?: () => void
): Entity[] {
  const entities: Entity[] = [];
  // Look for 12 digits: [2-9]\d{3}[ -]?\d{4}[ -]?\d{4}
  const aadhaarRegex = /(?<!\w)([2-9]\d{3})([ -]?)(\d{4})\2(\d{4})(?!\w)/g;

  let match: RegExpExecArray | null;
  while ((match = aadhaarRegex.exec(text)) !== null) {
    const raw = match[0];
    const cleanDigits = raw.replace(/[\s-]/g, '');

    if (cleanDigits.length === 12) {
      if (validateVerhoeff(cleanDigits)) {
        entities.push({
          type: 'AADHAAR',
          start: match.index,
          end: match.index + raw.length,
          value: raw,
          confidence: 0.99,
          normalized: cleanDigits,
        });
      } else {
        if (onReject) onReject();
      }
    }
  }

  return entities;
}

/**
 * PAN Detector:
 * 5 letters + 4 digits + 1 letter.
 * 4th letter is the holder type code (P, C, H, F, A, B, L, J, G, T).
 */
export function detectPAN(text: string): Entity[] {
  const entities: Entity[] = [];
  const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/gi;

  let match: RegExpExecArray | null;
  while ((match = panRegex.exec(text)) !== null) {
    const raw = match[0];
    if (validatePAN(raw)) {
      entities.push({
        type: 'PAN',
        start: match.index,
        end: match.index + raw.length,
        value: raw,
        confidence: 0.98,
        normalized: raw.toUpperCase(),
      });
    }
  }

  return entities;
}

/**
 * Email Detector:
 * RFC-practical regex matching email addresses.
 */
export function detectEmails(text: string): Entity[] {
  const entities: Entity[] = [];
  // Standard RFC-practical email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(text)) !== null) {
    const raw = match[0];
    entities.push({
      type: 'EMAIL',
      start: match.index,
      end: match.index + raw.length,
      value: raw,
      confidence: 0.99,
      normalized: raw.toLowerCase(),
    });
  }

  return entities;
}

/**
 * IP Detector:
 * IPv4 (validating 0-255 per octet) and IPv6.
 */
export function detectIPs(text: string): Entity[] {
  const entities: Entity[] = [];

  // IPv4 candidate regex: 4 octets separated by dots
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  let match: RegExpExecArray | null;
  while ((match = ipv4Regex.exec(text)) !== null) {
    const raw = match[0];
    if (validateIPv4(raw)) {
      entities.push({
        type: 'IP',
        start: match.index,
        end: match.index + raw.length,
        value: raw,
        confidence: 0.95,
        normalized: raw,
      });
    }
  }

  // IPv6 candidate regex: matches full and compressed IPv6 tokens (validated strictly by validateIPv6)
  const ipv6Regex = /(?<![0-9a-fA-F:])(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?![0-9a-fA-F:])/gi;
  while ((match = ipv6Regex.exec(text)) !== null) {
    const raw = match[0];
    if (validateIPv6(raw)) {
      entities.push({
        type: 'IP',
        start: match.index,
        end: match.index + raw.length,
        value: raw,
        confidence: 0.95,
        normalized: raw.toLowerCase(),
      });
    }
  }

  return entities;
}

/**
 * Phone Detector:
 * Indian mobile/landline numbers (+91 / 0 prefix, 10 digits starting 6-9, optional spaces/hyphens)
 * and generic international E.164 formats (+1-xxx-xxx-xxxx, +44 ..., etc.)
 * Strictly avoids timestamps, order numbers, hex codes, or 12/16-digit sequences.
 */
export function detectPhones(text: string): Entity[] {
  const entities: Entity[] = [];

  // Regex for Indian mobile numbers:
  // e.g. +91 98765 43210, +91-9876543210, 09876543210, 9876543210, 98765-43210
  const indianPhoneRegex = /(?:(?:\+91|91|0)[ -]?)?[6-9]\d{4}[ -]?\d{5}\b/g;

  // Regex for international E.164-like numbers:
  // e.g. +1 (555) 123-4567, +44 20 7946 0958, +1-800-555-0199
  const intlPhoneRegex = /\+\d{1,3}(?:[ -]?\(?\d{2,4}\)?){1,4}[ -]?\d{3,4}\b/g;

  const tryAdd = (raw: string, start: number) => {
    // Avoid if part of an order ID or timestamp
    if (isPartOfOrderOrTimestamp(text, start, start + raw.length)) return;

    const digitsOnly = raw.replace(/\D/g, '');
    // Avoid short digit sequences or overly long card sequences
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      entities.push({
        type: 'PHONE',
        start,
        end: start + raw.length,
        value: raw,
        confidence: 0.9,
        normalized: digitsOnly,
      });
    }
  };

  let match: RegExpExecArray | null;
  while ((match = indianPhoneRegex.exec(text)) !== null) {
    tryAdd(match[0], match.index);
  }

  while ((match = intlPhoneRegex.exec(text)) !== null) {
    tryAdd(match[0], match.index);
  }

  return entities;
}

/**
 * Main detection engine coordinating all pure detectors and resolving overlaps.
 */
export function detectPII(text: string): DetectionResult {
  const startTime = performance.now();
  let rejectedLuhnCount = 0;
  let rejectedVerhoeffCount = 0;

  const cards = detectCreditCards(text, () => {
    rejectedLuhnCount++;
  });
  const aadhaar = detectAadhaar(text, () => {
    rejectedVerhoeffCount++;
  });
  const pan = detectPAN(text);
  const emails = detectEmails(text);
  const ips = detectIPs(text);
  const phones = detectPhones(text);

  const allCandidates = [
    ...cards,
    ...aadhaar,
    ...pan,
    ...emails,
    ...ips,
    ...phones,
  ];

  const resolved = resolveOverlaps(allCandidates);
  const endTime = performance.now();

  return {
    entities: resolved,
    rejectedLuhnCount,
    rejectedVerhoeffCount,
    processingTimeMs: Math.round((endTime - startTime) * 100) / 100,
  };
}
