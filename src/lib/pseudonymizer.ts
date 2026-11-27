import type { EntityType } from './detectors.ts';

export interface PseudonymEntry {
  key: string;
  type: EntityType;
  normalized: string;
  originalSample: string;
  placeholder: string;
  count: number;
}

const PSEUDONYM_PREFIX: Record<EntityType, string> = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IP_ADDRESS: 'IP',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CREDIT_CARD: 'CARD',
  CUSTOM: 'CUSTOM',
};

/**
 * Normalizes entity values so formatting and casing variations map to one pseudonym.
 */
export function normalizeEntityValue(type: EntityType, value: string): string {
  switch (type) {
    case 'EMAIL':
    case 'IP_ADDRESS':
      return value.trim().toLowerCase();
    case 'PHONE':
    case 'CREDIT_CARD':
    case 'AADHAAR':
      return value.replace(/[\s-]/g, '').trim();
    case 'PAN':
      return value.trim().toUpperCase();
    case 'CUSTOM':
      return value.trim();
  }
}

/**
 * Creates a consistent pseudonymizer maintaining an independent Map & counter per entity type.
 */
export function createPseudonymizer() {
  const mapsByType: Record<EntityType, Map<string, PseudonymEntry>> = {
    EMAIL: new Map(),
    PHONE: new Map(),
    IP_ADDRESS: new Map(),
    PAN: new Map(),
    AADHAAR: new Map(),
    CREDIT_CARD: new Map(),
    CUSTOM: new Map(),
  };

  const counters: Record<EntityType, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP_ADDRESS: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
    CUSTOM: 0,
  };

  function getPlaceholder(type: EntityType, rawValue: string): string {
    const normalized = normalizeEntityValue(type, rawValue);
    const typeMap = mapsByType[type];
    const existing = typeMap.get(normalized);
    if (existing) {
      existing.count += 1;
      return existing.placeholder;
    }

    counters[type] += 1;
    const seq = String(counters[type]).padStart(2, '0');
    const placeholder = `${PSEUDONYM_PREFIX[type]}_${seq}`;
    typeMap.set(normalized, {
      key: `${type}:${normalized}`,
      type,
      normalized,
      originalSample: rawValue,
      placeholder,
      count: 1,
    });
    return placeholder;
  }

  function getEntries(): PseudonymEntry[] {
    const all: PseudonymEntry[] = [];
    (Object.keys(mapsByType) as EntityType[]).forEach((type) => {
      mapsByType[type].forEach((entry) => all.push(entry));
    });
    return all;
  }

  return { getPlaceholder, getEntries };
}

/**
 * Reverses consistent pseudonymization tokens back to their normalized values.
 */
export function restorePseudonyms(sanitizedText: string, entries: PseudonymEntry[]): string {
  if (!entries.length || !sanitizedText) return sanitizedText;
  const lookup = new Map<string, string>();
  for (const entry of entries) {
    lookup.set(entry.placeholder, entry.normalized);
  }
  const escapedTokens = [...lookup.keys()]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escapedTokens.length) return sanitizedText;

  const regex = new RegExp(`\\b(?:${escapedTokens.join('|')})\\b`, 'g');
  return sanitizedText.replace(regex, (token) => lookup.get(token) ?? token);
}

export type Pseudonymizer = ReturnType<typeof createPseudonymizer>;
