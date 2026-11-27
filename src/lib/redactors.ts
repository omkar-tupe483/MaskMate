import { Entity, EntityType } from './types.js';
import { normalizeEntityValue } from './detectors.js';

export type RedactionMode = 'FULL' | 'PARTIAL' | 'PSEUDONYM';

export interface RedactionOptions {
  mode: RedactionMode;
  includeTypeTagInFullMask?: boolean; // e.g. [REDACTED:EMAIL] vs [REDACTED]
  activeTypes: Set<EntityType>;
}

export interface RedactionResult {
  sanitizedText: string;
  sanitizedEntities: Array<{
    originalEntity: Entity;
    replacement: string;
    start: number;
    end: number;
  }>;
  mappingTable: Map<string, { placeholder: string; type: EntityType; count: number }>;
}

/**
 * Mask an entity using Partial Masking rule:
 * - credit card: XXXX-XXXX-XXXX-1234 (keep last 4)
 * - Aadhaar: XXXX-XXXX-9012 (keep last 4)
 * - PAN: ABXXXXXX4F (keep first 2 and last 2)
 * - phone: +91-XXXXXX3210 (keep last 4, preserve leading country code if present)
 * - email: j***@gmail.com (keep first char and domain)
 * - IP: 192.168.XXX.XXX (mask host octets)
 */
export function getPartialMask(entity: Entity): string {
  const val = entity.value;

  switch (entity.type) {
    case 'CREDIT_CARD': {
      const clean = val.replace(/[\s-]/g, '');
      const last4 = clean.slice(-4);
      if (val.includes('-')) {
        return `XXXX-XXXX-XXXX-${last4}`;
      } else if (val.includes(' ')) {
        return `XXXX XXXX XXXX ${last4}`;
      }
      return `XXXXXXXXXXXX${last4}`;
    }
    case 'AADHAAR': {
      const clean = val.replace(/[\s-]/g, '');
      const last4 = clean.slice(-4);
      if (val.includes('-')) {
        return `XXXX-XXXX-${last4}`;
      } else if (val.includes(' ')) {
        return `XXXX XXXX ${last4}`;
      }
      return `XXXXXXXX${last4}`;
    }
    case 'PAN': {
      const clean = val.trim().toUpperCase();
      if (clean.length === 10) {
        return `${clean.slice(0, 2)}XXXXXX${clean.slice(8)}`;
      }
      return 'XX******XX';
    }
    case 'PHONE': {
      const digits = val.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      if (val.startsWith('+91')) {
        return `+91-XXXXXX${last4}`;
      } else if (val.startsWith('+')) {
        const countryCodeMatch = val.match(/^\+\d{1,3}/);
        const prefix = countryCodeMatch ? countryCodeMatch[0] : '+';
        return `${prefix}-XXXXXX${last4}`;
      }
      return `XXXXXX${last4}`;
    }
    case 'EMAIL': {
      const parts = val.split('@');
      if (parts.length === 2) {
        const [user, domain] = parts;
        const firstChar = user[0] || '';
        return `${firstChar}***@${domain}`;
      }
      return '***@***.***';
    }
    case 'IP': {
      if (val.includes('.')) {
        // IPv4
        const octets = val.split('.');
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.XXX.XXX`;
        }
      } else if (val.includes(':')) {
        // IPv6
        const parts = val.split(':');
        if (parts.length > 2) {
          return `${parts[0]}:${parts[1]}:XXXX:XXXX::XXXX`;
        }
      }
      return 'XXX.XXX.XXX.XXX';
    }
    default:
      return '[REDACTED]';
  }
}

/**
 * Apply redaction according to selected mode and enabled types.
 */
export function redactText(
  text: string,
  entities: Entity[],
  options: RedactionOptions
): RedactionResult {
  const { mode, includeTypeTagInFullMask = true, activeTypes } = options;

  // Filter entities according to activeTypes
  const filteredEntities = entities.filter((e) => activeTypes.has(e.type));

  // Consistent Pseudonymization state
  // key: normalizedValue, value: { placeholder, type, count }
  const mappingTable = new Map<string, { placeholder: string; type: EntityType; count: number }>();
  const typeCounters: Record<EntityType, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };

  if (mode === 'PSEUDONYM') {
    // Pre-populate consistent mapping in order of appearance
    for (const entity of filteredEntities) {
      const normKey = `${entity.type}:${normalizeEntityValue(entity.type, entity.value)}`;
      if (!mappingTable.has(normKey)) {
        typeCounters[entity.type]++;
        const counterStr = String(typeCounters[entity.type]).padStart(2, '0');
        const placeholder = `${entity.type}_${counterStr}`;
        mappingTable.set(normKey, { placeholder, type: entity.type, count: 1 });
      } else {
        const existing = mappingTable.get(normKey)!;
        existing.count++;
      }
    }
  }

  // Construct sanitized string and map sanitized entities with new offsets
  let sanitizedText = '';
  let lastIndex = 0;
  const sanitizedEntities: RedactionResult['sanitizedEntities'] = [];

  for (const entity of filteredEntities) {
    // Append unchanged chunk
    sanitizedText += text.substring(lastIndex, entity.start);

    let replacement = '';
    if (mode === 'FULL') {
      replacement = includeTypeTagInFullMask
        ? `[REDACTED:${entity.type}]`
        : '[REDACTED]';
    } else if (mode === 'PARTIAL') {
      replacement = getPartialMask(entity);
    } else if (mode === 'PSEUDONYM') {
      const normKey = `${entity.type}:${normalizeEntityValue(entity.type, entity.value)}`;
      replacement = mappingTable.get(normKey)?.placeholder || `[${entity.type}]`;
    }

    const startInSanitized = sanitizedText.length;
    sanitizedText += replacement;
    const endInSanitized = sanitizedText.length;

    sanitizedEntities.push({
      originalEntity: entity,
      replacement,
      start: startInSanitized,
      end: endInSanitized,
    });

    lastIndex = entity.end;
  }

  // Append remaining text
  sanitizedText += text.substring(lastIndex);

  return {
    sanitizedText,
    sanitizedEntities,
    mappingTable,
  };
}

