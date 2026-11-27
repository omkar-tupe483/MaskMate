import type { CustomPatternDefinition, DetectedEntity } from './detectors.ts';
import {
  runCustomPatternsSync,
  type CustomRegexJobResponse,
} from '../workers/customRegexWorker.ts';

export const CUSTOM_REGEX_TIMEOUT_MS = 500;
export const CUSTOM_REGEX_TIMEOUT_MESSAGE =
  'This custom pattern is taking too long and was stopped.';

export interface WorkerFactoryLike {
  (): {
    postMessage: (data: unknown) => void;
    terminate: () => void;
    addEventListener: (type: 'message' | 'error', listener: (ev: MessageEvent) => void) => void;
    removeEventListener: (type: 'message' | 'error', listener: (ev: MessageEvent) => void) => void;
  };
}

function defaultWorkerFactory(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('../workers/customRegexWorker.ts', import.meta.url), {
    type: 'module',
  });
}

/**
 * Manages a dedicated custom-pattern Web Worker with a strict 500 ms execution timeout.
 * Terminates and respawns the worker if any pattern exceeds 500 ms (ReDoS protection).
 */
export function createCustomPatternRunner(
  createWorker: () => ReturnType<WorkerFactoryLike> | null = defaultWorkerFactory,
  timeoutMs: number = CUSTOM_REGEX_TIMEOUT_MS
) {
  let worker: ReturnType<WorkerFactoryLike> | null = null;
  let activeTimer: ReturnType<typeof setTimeout> | null = null;
  let jobCounter = 0;

  const terminateActive = () => {
    if (activeTimer !== null) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    if (worker) {
      worker.terminate();
      worker = null;
    }
  };

  const ensureWorker = () => {
    if (!worker) {
      worker = createWorker();
    }
    return worker;
  };

  async function run(
    text: string,
    patterns: CustomPatternDefinition[]
  ): Promise<{ entities: DetectedEntity[]; timedOut: boolean; error?: string }> {
    const enabled = patterns.filter((p) => p.enabled && p.pattern.trim().length > 0);
    if (!text || enabled.length === 0) {
      return { entities: [], timedOut: false };
    }

    const activeWorker = ensureWorker();
    if (!activeWorker) {
      // Fallback when Web Workers are unavailable (e.g. Node unit tests)
      return {
        entities: runCustomPatternsSync(text, enabled),
        timedOut: false,
      };
    }

    jobCounter += 1;
    const currentJobId = jobCounter;

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        if (activeTimer !== null) {
          clearTimeout(activeTimer);
          activeTimer = null;
        }
        activeWorker.removeEventListener('message', onMessage);
        activeWorker.removeEventListener('error', onError);
      };

      const onMessage = (ev: MessageEvent) => {
        const data = ev.data as CustomRegexJobResponse;
        if (!data || data.jobId !== currentJobId || settled) return;
        settled = true;
        cleanup();
        resolve({
          entities: data.entities,
          timedOut: false,
          error: data.error,
        });
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        terminateActive();
        resolve({
          entities: [],
          timedOut: false,
          error: 'Custom pattern worker encountered an error and was restarted.',
        });
      };

      activeWorker.addEventListener('message', onMessage);
      activeWorker.addEventListener('error', onError);

      activeTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        // Kill runaway catastrophic-backtracking worker and leave clean slate for next run
        terminateActive();
        resolve({
          entities: [],
          timedOut: true,
          error: CUSTOM_REGEX_TIMEOUT_MESSAGE,
        });
      }, timeoutMs);

      activeWorker.postMessage({
        jobId: currentJobId,
        text,
        patterns: enabled,
      });
    });
  }

  return {
    run,
    dispose: terminateActive,
  };
}

