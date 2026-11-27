import type { CustomPatternDefinition, DetectedEntity } from '../lib/detectors.ts';

export interface CustomRegexJobRequest {
  jobId: number;
  text: string;
  patterns: CustomPatternDefinition[];
}

export interface CustomRegexJobResponse {
  jobId: number;
  entities: DetectedEntity[];
  error?: string;
}

const MAX_MATCHES_PER_RULE = 10_000;

export function runCustomPatternsSync(
  text: string,
  patterns: CustomPatternDefinition[]
): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  for (const rule of patterns) {
    if (!rule.enabled || !rule.pattern) continue;
    const rawFlags = rule.flags.replace(/[^gimsuy]/g, '');
    const flags = rawFlags.includes('g') ? rawFlags : `${rawFlags}g`;
    let regex: RegExp;
    try {
      regex = new RegExp(rule.pattern, flags);
    } catch {
      continue;
    }

    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      entities.push({
        id: `CUSTOM-${rule.id}-${match.index}`,
        type: 'CUSTOM',
        start: match.index,
        end: match.index + match[0].length,
        value: match[0],
        normalized: match[0].trim(),
        confidence: 0.85,
        customLabel: rule.label,
      });
      count += 1;
      if (count >= MAX_MATCHES_PER_RULE) break;
    }
  }

  return entities;
}

if (typeof self !== 'undefined' && typeof (self as unknown as Worker).postMessage === 'function') {
  self.addEventListener('message', (event: MessageEvent<CustomRegexJobRequest>) => {
    const { jobId, text, patterns } = event.data;
    try {
      const entities = runCustomPatternsSync(text, patterns);
      const response: CustomRegexJobResponse = { jobId, entities };
      self.postMessage(response);
    } catch (err) {
      const response: CustomRegexJobResponse = {
        jobId,
        entities: [],
        error: err instanceof Error ? err.message : 'Custom pattern execution failed.',
      };
      self.postMessage(response);
    }
  });
}

