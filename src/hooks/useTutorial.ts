import { useCallback, useEffect, useMemo, useState } from 'react';

export const TUTORIAL_STORAGE_KEY = 'maskmate.tutorial.v1';

export type TutorialPhase = 'idle' | 'welcome' | 'summary' | 'walkthrough' | 'complete';

export interface TutorialStepConfig {
  id: string;
  targetSelector: string;
  title: string;
  body: string;
  requireAction?: boolean;
  actionHint?: string;
}

export const TUTORIAL_STEPS: readonly TutorialStepConfig[] = [
  {
    id: 'privacy-badge',
    targetSelector: '[data-tour="privacy-badge"]',
    title: '100% Local Privacy Shield',
    body: 'Every scan and redaction runs completely inside your browser. With connect-src \'none\', zero data ever leaves this device.',
  },
  {
    id: 'load-sample',
    targetSelector: '[data-tour="load-sample-btn"]',
    title: 'Quest: Load Sample Noisy Text',
    body: 'Click "Load Sample Noisy Text" inside the spotlight to populate emails, phones, PAN, Aadhaar, valid cards, and Luhn decoys.',
    requireAction: true,
    actionHint: 'Click "Load Sample Noisy Text" to unlock Next',
  },
  {
    id: 'input-panel',
    targetSelector: '[data-tour="input-panel"]',
    title: 'Paste or Drop Files',
    body: 'Paste raw text anytime, or upload and drag-and-drop .txt and .csv files up to 5 MB via FileReader.',
  },
  {
    id: 'diff-highlights',
    targetSelector: '[data-tour="diff-highlights"]',
    title: 'Color-Coded Entity Legend',
    body: 'Each PII category gets a distinct color badge and underline pattern. Overlapping matches resolve deterministically so cards never double-match as phones.',
  },
  {
    id: 'entity-toggles',
    targetSelector: '[data-tour="entity-toggles"]',
    title: 'Filter Entity Types',
    body: 'Toggle individual PII types on or off to decide exactly what gets redacted in the output.',
  },
  {
    id: 'mode-switch',
    targetSelector: '[data-tour="mode-switch"]',
    title: 'Quest: Try All Three Redaction Modes',
    body: 'Switch between Full Mask, Partial Mask, and Consistent Pseudonymization to see live output transforms.',
    requireAction: true,
    actionHint: 'Try switching modes above to continue',
  },
  {
    id: 'diff-view',
    targetSelector: '[data-tour="diff-view"]',
    title: 'Synced Side-by-Side Diff',
    body: 'Scroll both panels together and hover any highlighted detection on the left to spotlight its exact replacement on the right.',
  },
  {
    id: 'audit-panel',
    targetSelector: '[data-tour="audit-panel"]',
    title: 'Audit Counts & Pseudonym Map',
    body: 'Inspect total entities, per-type bar metrics, Luhn/Verhoeff checksum rejections, and the collapsible Pseudonym Map.',
  },
  {
    id: 'download-btn',
    targetSelector: '[data-tour="download-btn"]',
    title: 'Download Sanitized Output',
    body: 'Export your cleaned .txt or .csv locally via Blob (with CSV rows and quoting preserved), or copy straight to clipboard.',
  },
];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getSafeStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function readTutorialSeen(storage: StorageLike | null = getSafeStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TUTORIAL_STORAGE_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function markTutorialSeen(storage: StorageLike | null = getSafeStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, 'seen');
  } catch {
    // Ignore storage unavailability
  }
}

export function findNextStepIndex(
  steps: readonly TutorialStepConfig[],
  fromIndex: number,
  direction: 1 | -1,
  hasTarget: (selector: string) => boolean
): number {
  let idx = fromIndex + direction;
  while (idx >= 0 && idx < steps.length) {
    if (hasTarget(steps[idx].targetSelector)) return idx;
    idx += direction;
  }
  return -1;
}

export function useTutorial(options?: {
  hasTarget?: (selector: string) => boolean;
}) {
  const [phase, setPhase] = useState<TutorialPhase>(() =>
    readTutorialSeen() ? 'idle' : 'welcome'
  );
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => new Set());
  const [triedModes, setTriedModes] = useState<Set<string>>(() => new Set());

  const defaultHasTarget = useCallback((selector: string) => {
    if (typeof document === 'undefined') return true;
    return Boolean(document.querySelector(selector));
  }, []);

  const hasTarget = options?.hasTarget ?? defaultHasTarget;

  const currentStep = useMemo(
    () => (phase === 'walkthrough' ? TUTORIAL_STEPS[stepIndex] ?? null : null),
    [phase, stepIndex]
  );

  const isCurrentActionComplete = useMemo(() => {
    if (!currentStep?.requireAction) return true;
    return completedActions.has(currentStep.id);
  }, [currentStep, completedActions]);

  const markActionComplete = useCallback((stepId: string) => {
    setCompletedActions((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }, []);

  const recordModeTried = useCallback(
    (modeValue: string) => {
      if (phase !== 'walkthrough') return;
      setTriedModes((prev) => {
        const next = new Set(prev);
        next.add(modeValue);
        if (next.size >= 2) {
          markActionComplete('mode-switch');
        }
        return next;
      });
    },
    [phase, markActionComplete]
  );

  const openWelcome = useCallback(() => {
    setPhase('welcome');
  }, []);

  const chooseYes = useCallback(() => {
    markTutorialSeen();
    setPhase('summary');
  }, []);

  const chooseNo = useCallback(() => {
    markTutorialSeen();
    setCompletedActions(new Set());
    setTriedModes(new Set());
    const firstValid = findNextStepIndex(TUTORIAL_STEPS, -1, 1, hasTarget);
    setStepIndex(firstValid >= 0 ? firstValid : 0);
    setPhase('walkthrough');
  }, [hasTarget]);

  const closeTutorial = useCallback(() => {
    markTutorialSeen();
    setPhase('idle');
  }, []);

  const nextStep = useCallback(() => {
    if (phase !== 'walkthrough') return;
    if (currentStep?.requireAction && !completedActions.has(currentStep.id)) return;
    const nextIdx = findNextStepIndex(TUTORIAL_STEPS, stepIndex, 1, hasTarget);
    if (nextIdx >= 0) {
      setStepIndex(nextIdx);
    } else {
      setPhase('complete');
    }
  }, [phase, currentStep, completedActions, stepIndex, hasTarget]);

  const prevStep = useCallback(() => {
    if (phase !== 'walkthrough') return;
    const prevIdx = findNextStepIndex(TUTORIAL_STEPS, stepIndex, -1, hasTarget);
    if (prevIdx >= 0) {
      setStepIndex(prevIdx);
    }
  }, [phase, stepIndex, hasTarget]);

  const replayTutorial = useCallback(() => {
    setPhase('welcome');
  }, []);

  // Keyboard navigation during walkthrough
  useEffect(() => {
    if (phase !== 'walkthrough') return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'));
      if (inEditable && e.key !== 'Escape') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeTutorial();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (target?.tagName === 'BUTTON' && e.key === 'Enter') return;
        if (isCurrentActionComplete) {
          e.preventDefault();
          nextStep();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, closeTutorial, nextStep, prevStep, isCurrentActionComplete]);

  return {
    phase,
    stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    currentStep,
    isCurrentActionComplete,
    completedActions,
    triedModes,
    openWelcome,
    chooseYes,
    chooseNo,
    closeTutorial,
    nextStep,
    prevStep,
    replayTutorial,
    markActionComplete,
    recordModeTried,
  };
}

