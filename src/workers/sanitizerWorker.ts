import { detectPII, type DetectedEntity, type EntityType } from '../lib/detectors.ts';
import { redactPlainText, type RedactedReplacement, type RedactionMode } from '../lib/redactors.ts';
import { sanitizeCsv } from '../lib/csv.ts';
import type { PseudonymEntry } from '../lib/pseudonymizer.ts';

export interface SanitizerWorkerRequest {
  jobId: number;
  text: string;
  isCsv: boolean;
  mode: RedactionMode;
  includeTypeTagInFullMask: boolean;
  activeTypes: EntityType[];
  ignoredIds: string[];
  customEntities: DetectedEntity[];
}

export interface SanitizerWorkerResponse {
  jobId: number;
  entities: DetectedEntity[];
  replacements: RedactedReplacement[];
  sanitizedText: string;
  safeExportText: string;
  originalForDiff: string;
  pseudonymEntries: PseudonymEntry[];
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  processingTimeMs: number;
}

export function runSanitizerJobSync(req: SanitizerWorkerRequest): SanitizerWorkerResponse {
  const activeSet = new Set<EntityType>(req.activeTypes);
  const ignoredSet = new Set<string>(req.ignoredIds);

  if (!req.text) {
    return {
      jobId: req.jobId,
      entities: [],
      replacements: [],
      sanitizedText: '',
      safeExportText: '',
      originalForDiff: '',
      pseudonymEntries: [],
      rejectedLuhnCount: 0,
      rejectedVerhoeffCount: 0,
      processingTimeMs: 0,
    };
  }

  if (req.isCsv) {
    const csvOut = sanitizeCsv(req.text, {
      mode: req.mode,
      includeTypeTagInFullMask: req.includeTypeTagInFullMask,
      activeTypes: activeSet,
      ignoredIds: ignoredSet,
    });
    return {
      jobId: req.jobId,
      entities: csvOut.entities,
      replacements: csvOut.replacements,
      sanitizedText: csvOut.sanitizedCsv,
      safeExportText: csvOut.safeExportCsv,
      originalForDiff: csvOut.originalRebuilt,
      pseudonymEntries: csvOut.pseudonymEntries,
      rejectedLuhnCount: csvOut.rejectedLuhnCount,
      rejectedVerhoeffCount: csvOut.rejectedVerhoeffCount,
      processingTimeMs: csvOut.processingTimeMs,
    };
  }

  const det = detectPII(req.text, req.customEntities);
  const red = redactPlainText(
    req.text,
    {
      mode: req.mode,
      includeTypeTagInFullMask: req.includeTypeTagInFullMask,
      activeTypes: activeSet,
      ignoredIds: ignoredSet,
    },
    det.entities
  );

  return {
    jobId: req.jobId,
    entities: det.entities,
    replacements: red.replacements,
    sanitizedText: red.sanitizedText,
    safeExportText: red.sanitizedText,
    originalForDiff: req.text,
    pseudonymEntries: red.pseudonymEntries,
    rejectedLuhnCount: det.rejectedLuhnCount,
    rejectedVerhoeffCount: det.rejectedVerhoeffCount,
    processingTimeMs: det.processingTimeMs,
  };
}

if (typeof self !== 'undefined' && typeof (self as unknown as Worker).postMessage === 'function') {
  self.addEventListener('message', (event: MessageEvent<SanitizerWorkerRequest>) => {
    const result = runSanitizerJobSync(event.data);
    self.postMessage(result);
  });
}

