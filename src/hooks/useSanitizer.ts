import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CustomPatternDefinition, DetectedEntity, EntityType } from '../lib/detectors.ts';
import type { RedactionMode } from '../lib/redactors.ts';
import {
  CUSTOM_REGEX_TIMEOUT_MESSAGE,
  createCustomPatternRunner,
} from '../lib/customPatternRunner.ts';
import {
  runSanitizerJobSync,
  type SanitizerWorkerRequest,
  type SanitizerWorkerResponse,
} from '../workers/sanitizerWorker.ts';

export const ALL_ENTITY_TYPES: readonly EntityType[] = [
  'EMAIL',
  'PHONE',
  'IP_ADDRESS',
  'PAN',
  'AADHAAR',
  'CREDIT_CARD',
  'CUSTOM',
];

const CUSTOM_PATTERNS_STORAGE_KEY = 'maskmate.customPatterns.v1';
const DEBOUNCE_MS = 200;

interface SanitizerJobSnapshot {
  forText: string;
  forCsv: boolean;
  forMode: RedactionMode;
  forTag: boolean;
  forTypes: Set<EntityType>;
  forIgnored: Set<string>;
  forCustom: CustomPatternDefinition[];
  result: Omit<SanitizerWorkerResponse, 'jobId'>;
  error: string | null;
}

const EMPTY_WORKER_RESULT: Omit<SanitizerWorkerResponse, 'jobId'> = {
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

function loadStoredCustomPatterns(): CustomPatternDefinition[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(CUSTOM_PATTERNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is CustomPatternDefinition =>
        typeof r === 'object' &&
        r !== null &&
        typeof r.id === 'string' &&
        typeof r.label === 'string' &&
        typeof r.pattern === 'string' &&
        typeof r.flags === 'string' &&
        typeof r.enabled === 'boolean'
    );
  } catch {
    return [];
  }
}

export function useSanitizer() {
  const [rawText, setRawTextState] = useState<string>('');
  const [debouncedText, setDebouncedText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<RedactionMode>('FULL');
  const [includeTypeTagInFullMask, setIncludeTypeTagInFullMask] = useState<boolean>(true);
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(
    () => new Set(ALL_ENTITY_TYPES)
  );
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(() => new Set());

  // Undo / Redo stacks (in-memory only; cleared on Clear All Data)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Custom patterns (non-sensitive definitions persisted in localStorage)
  const [customPatterns, setCustomPatterns] = useState<CustomPatternDefinition[]>(
    loadStoredCustomPatterns
  );

  const [jobSnapshot, setJobSnapshot] = useState<SanitizerJobSnapshot | null>(null);

  const sanitizerWorkerRef = useRef<Worker | null>(null);
  const customRunnerRef = useRef<ReturnType<typeof createCustomPatternRunner> | null>(null);
  const latestJobIdRef = useRef<number>(0);

  const isCsv = useMemo(
    () => Boolean(fileName && fileName.toLowerCase().endsWith('.csv')),
    [fileName]
  );

  // Persist ONLY custom pattern definitions (never input text or matches)
  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_PATTERNS_STORAGE_KEY, JSON.stringify(customPatterns));
    } catch {
      // Ignore storage errors
    }
  }, [customPatterns]);

  // Debounce typing (~200 ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedText(rawText);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [rawText]);

  // Initialize workers cleanly
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      sanitizerWorkerRef.current = new Worker(
        new URL('../workers/sanitizerWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    customRunnerRef.current = createCustomPatternRunner();

    return () => {
      sanitizerWorkerRef.current?.terminate();
      sanitizerWorkerRef.current = null;
      customRunnerRef.current?.dispose();
      customRunnerRef.current = null;
    };
  }, []);

  // Run custom patterns (500 ms timeout) then built-in detection & redaction in Web Worker
  useEffect(() => {
    if (!debouncedText) {
      return undefined;
    }

    latestJobIdRef.current += 1;
    const jobId = latestJobIdRef.current;
    let cancelled = false;

    const runPipeline = async () => {
      let customEntities: DetectedEntity[] = [];
      let nextWorkerError: string | null = null;
      const enabledCustom = customPatterns.filter((p) => p.enabled);

      if (enabledCustom.length > 0 && customRunnerRef.current) {
        const customOut = await customRunnerRef.current.run(debouncedText, enabledCustom);
        if (cancelled || jobId !== latestJobIdRef.current) return;
        if (customOut.timedOut) {
          nextWorkerError = customOut.error || CUSTOM_REGEX_TIMEOUT_MESSAGE;
        } else if (customOut.error) {
          nextWorkerError = customOut.error;
        } else {
          customEntities = customOut.entities;
        }
      }

      const payload: SanitizerWorkerRequest = {
        jobId,
        text: debouncedText,
        isCsv,
        mode,
        includeTypeTagInFullMask,
        activeTypes: Array.from(activeTypes),
        ignoredIds: Array.from(ignoredIds),
        customEntities,
      };

      const worker = sanitizerWorkerRef.current;
      if (!worker) {
        await Promise.resolve();
        const syncRes = runSanitizerJobSync(payload);
        if (cancelled || jobId !== latestJobIdRef.current) return;
        setJobSnapshot({
          forText: debouncedText,
          forCsv: isCsv,
          forMode: mode,
          forTag: includeTypeTagInFullMask,
          forTypes: activeTypes,
          forIgnored: ignoredIds,
          forCustom: customPatterns,
          result: syncRes,
          error: nextWorkerError,
        });
        return;
      }

      const onMessage = (ev: MessageEvent<SanitizerWorkerResponse>) => {
        const res = ev.data;
        if (!res || res.jobId !== jobId) return;
        worker.removeEventListener('message', onMessage);
        if (cancelled || jobId !== latestJobIdRef.current) return;
        setJobSnapshot({
          forText: debouncedText,
          forCsv: isCsv,
          forMode: mode,
          forTag: includeTypeTagInFullMask,
          forTypes: activeTypes,
          forIgnored: ignoredIds,
          forCustom: customPatterns,
          result: res,
          error: nextWorkerError,
        });
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage(payload);
    };

    runPipeline();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedText,
    isCsv,
    mode,
    includeTypeTagInFullMask,
    activeTypes,
    ignoredIds,
    customPatterns,
  ]);

  const snapshotMatchesCurrent = Boolean(
    jobSnapshot &&
      jobSnapshot.forText === debouncedText &&
      jobSnapshot.forCsv === isCsv &&
      jobSnapshot.forMode === mode &&
      jobSnapshot.forTag === includeTypeTagInFullMask &&
      jobSnapshot.forTypes === activeTypes &&
      jobSnapshot.forIgnored === ignoredIds &&
      jobSnapshot.forCustom === customPatterns
  );

  const workerResult = debouncedText && jobSnapshot ? jobSnapshot.result : EMPTY_WORKER_RESULT;
  const customWorkerError = debouncedText && jobSnapshot ? jobSnapshot.error : null;
  const isProcessing = Boolean(debouncedText) && !snapshotMatchesCurrent;

  const countsByType = useMemo(() => {
    const counts: Record<EntityType, number> = {
      EMAIL: 0,
      PHONE: 0,
      IP_ADDRESS: 0,
      PAN: 0,
      AADHAAR: 0,
      CREDIT_CARD: 0,
      CUSTOM: 0,
    };
    for (const entity of workerResult.entities) {
      counts[entity.type] += 1;
    }
    return counts;
  }, [workerResult.entities]);

  const setRawText = useCallback(
    (nextText: string) => {
      setUndoStack((prev) => [...prev.slice(-29), rawText]);
      setRedoStack([]);
      setRawTextState(nextText);
      if (!nextText) {
        setIgnoredIds(new Set());
      }
    },
    [rawText]
  );

  const undoInput = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((r) => [...r, rawText]);
    setRawTextState(last);
    setDebouncedText(last);
  }, [undoStack, rawText]);

  const redoInput = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((u) => [...u, rawText]);
    setRawTextState(next);
    setDebouncedText(next);
  }, [redoStack, rawText]);

  const loadText = useCallback(
    (text: string, uploadedName: string | null = null) => {
      setUndoStack((prev) => (rawText ? [...prev.slice(-29), rawText] : prev));
      setRedoStack([]);
      setRawTextState(text);
      setDebouncedText(text);
      setFileName(uploadedName);
      setIgnoredIds(new Set());
    },
    [rawText]
  );

  const clearAll = useCallback(() => {
    latestJobIdRef.current += 1;
    setRawTextState('');
    setDebouncedText('');
    setFileName(null);
    setIgnoredIds(new Set());
    setUndoStack([]);
    setRedoStack([]);
    setJobSnapshot(null);
  }, []);

  const toggleType = useCallback((type: EntityType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const selectAllTypes = useCallback(() => setActiveTypes(new Set(ALL_ENTITY_TYPES)), []);
  const deselectAllTypes = useCallback(() => setActiveTypes(new Set()), []);

  const toggleIgnoreEntity = useCallback((id: string) => {
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearIgnored = useCallback(() => setIgnoredIds(new Set()), []);

  const addCustomPattern = useCallback((rule: CustomPatternDefinition) => {
    setCustomPatterns((prev) => [...prev, rule]);
  }, []);

  const toggleCustomPattern = useCallback((id: string) => {
    setCustomPatterns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const deleteCustomPattern = useCallback((id: string) => {
    setCustomPatterns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    rawText,
    setRawText,
    fileName,
    isCsv,
    mode,
    setMode,
    includeTypeTagInFullMask,
    setIncludeTypeTagInFullMask,
    activeTypes,
    toggleType,
    selectAllTypes,
    deselectAllTypes,
    ignoredIds,
    toggleIgnoreEntity,
    clearIgnored,
    undoInput,
    redoInput,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    loadText,
    clearAll,
    customPatterns,
    addCustomPattern,
    toggleCustomPattern,
    deleteCustomPattern,
    customWorkerError,
    isProcessing,
    countsByType,
    ...workerResult,
  };
}
