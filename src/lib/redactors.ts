import { detectPII, type DetectedEntity, type EntityType } from './detectors.ts';
import { createPseudonymizer, type PseudonymEntry, type Pseudonymizer } from './pseudonymizer.ts';

export type RedactionMode = 'FULL' | 'PARTIAL' | 'PSEUDONYM';

export interface RedactionOptions {
  mode: RedactionMode;
  includeTypeTagInFullMask: boolean;
  activeTypes: ReadonlySet<EntityType>;
  ignoredIds?: ReadonlySet<string>;
}

export interface RedactedReplacement {
  id: string;
  originalEntity: DetectedEntity;
  replacement: string;
  start: number;
  end: number;
}

export interface RedactionOutput {
  sanitizedText: string;
  replacements: RedactedReplacement[];
  pseudonymEntries: PseudonymEntry[];
}

export function getPartialMask(entity: DetectedEntity): string {
  const val = entity.value;

  switch (entity.type) {
    case 'CREDIT_CARD': {
      const digits = val.replace(/[\s-]/g, '');
      const last4 = digits.slice(-4);
      return `XXXX-XXXX-XXXX-${last4}`;
    }
    case 'AADHAAR': {
      const digits = val.replace(/[\s-]/g, '');
      const last4 = digits.slice(-4);
      return `XXXX-XXXX-${last4}`;
    }
    case 'PAN': {
      const clean = val.trim().toUpperCase();
      if (clean.length === 10) {
        return `${clean.slice(0, 5)}****${clean.slice(9)}`;
      }
      return 'XXXXX****X';
    }
    case 'PHONE': {
      const digits = val.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      if (val.startsWith('+')) {
        const cc = val.match(/^\+\d{1,3}/)?.[0] ?? '+';
        return `${cc}-XXXXXX${last4}`;
      }
      return `XXXXXX${last4}`;
    }
    case 'EMAIL': {
      const atIdx = val.indexOf('@');
      if (atIdx >= 0) {
        const first = val.slice(0, 1) || '*';
        const domain = val.slice(atIdx + 1);
        return `${first}***@${domain}`;
      }
      return '***@***';
    }
    case 'IP_ADDRESS': {
      if (val.includes('.')) {
        const octets = val.split('.');
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.*.*`;
        }
      }
      if (val.includes(':')) {
        const parts = val.split(':');
        return `${parts[0] || '0'}:${parts[1] || '0'}:****:****`;
      }
      return '*.*.*.*';
    }
    case 'CUSTOM': {
      if (val.length <= 2) return '*'.repeat(val.length);
      return `${val[0]}${'*'.repeat(val.length - 2)}${val[val.length - 1]}`;
    }
  }
}

export function redactWithEntities(
  text: string,
  entities: DetectedEntity[],
  options: RedactionOptions,
  pseudonymizer: Pseudonymizer = createPseudonymizer()
): Omit<RedactionOutput, 'pseudonymEntries'> & { pseudonymizer: Pseudonymizer } {
  const activeEntities = entities.filter(
    (e) => options.activeTypes.has(e.type) && !options.ignoredIds?.has(e.id)
  );
  const chunks: string[] = [];
  const replacements: RedactedReplacement[] = [];
  let cursor = 0;
  let sanitizedLen = 0;

  for (const entity of activeEntities) {
    if (entity.start > cursor) {
      const gap = text.slice(cursor, entity.start);
      chunks.push(gap);
      sanitizedLen += gap.length;
    }

    let replacement = '';
    if (options.mode === 'FULL') {
      replacement = options.includeTypeTagInFullMask
        ? `[REDACTED:${entity.type}]`
        : '[REDACTED]';
    } else if (options.mode === 'PARTIAL') {
      replacement = getPartialMask(entity);
    } else {
      replacement = pseudonymizer.getPlaceholder(entity.type, entity.value);
    }

    const start = sanitizedLen;
    chunks.push(replacement);
    sanitizedLen += replacement.length;
    const end = sanitizedLen;

    replacements.push({
      id: entity.id,
      originalEntity: entity,
      replacement,
      start,
      end,
    });

    cursor = entity.end;
  }

  if (cursor < text.length) {
    chunks.push(text.slice(cursor));
  }

  return {
    sanitizedText: chunks.join(''),
    replacements,
    pseudonymizer,
  };
}

export function redactPlainText(
  text: string,
  options: RedactionOptions,
  precomputedEntities?: DetectedEntity[]
): RedactionOutput {
  const entities = precomputedEntities ?? detectPII(text).entities;
  const pseudonymizer = createPseudonymizer();
  const result = redactWithEntities(text, entities, options, pseudonymizer);
  return {
    sanitizedText: result.sanitizedText,
    replacements: result.replacements,
    pseudonymEntries: pseudonymizer.getEntries(),
  };
}
