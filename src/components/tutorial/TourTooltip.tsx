import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TutorialStepConfig } from '../../hooks/useTutorial.ts';
import type { SpotlightRect } from './Spotlight.tsx';

interface TourTooltipProps {
  step: TutorialStepConfig;
  stepIndex: number;
  totalSteps: number;
  targetRect: SpotlightRect | null;
  actionUnlocked: boolean;
  skipAnimations: boolean;
  onToggleSkipAnimations: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  actionUnlocked,
  skipAnimations,
  onToggleSkipAnimations,
  onNext,
  onBack,
  onSkip,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 24,
    left: 24,
  });

  useLayoutEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 16;
      const cardW = Math.min(360, vw - margin * 2);
      const cardH = cardRef.current?.offsetHeight || 280;

      if (!targetRect || vw < 640) {
        if (vw < 640 && targetRect) {
          setPos({
            top: Math.max(margin, vh - cardH - margin),
            left: Math.max(margin, Math.round((vw - cardW) / 2)),
          });
          return;
        }
        setPos({
          top: Math.max(margin, Math.round((vh - cardH) / 2)),
          left: Math.max(margin, Math.round((vw - cardW) / 2)),
        });
        return;
      }

      const gap = 16;
      const clampX = (x: number) => Math.max(margin, Math.min(x, vw - cardW - margin));
      const clampY = (y: number) => Math.max(margin, Math.min(y, vh - cardH - margin));
      const cx = targetRect.left + targetRect.width / 2 - cardW / 2;
      const cy = targetRect.top + targetRect.height / 2 - cardH / 2;

      if (targetRect.bottom + gap + cardH + margin <= vh) {
        setPos({ top: clampY(targetRect.bottom + gap), left: clampX(cx) });
      } else if (targetRect.top - gap - cardH - margin >= 0) {
        setPos({ top: clampY(targetRect.top - gap - cardH), left: clampX(cx) });
      } else if (targetRect.right + gap + cardW + margin <= vw) {
        setPos({ top: clampY(cy), left: clampX(targetRect.right + gap) });
      } else if (targetRect.left - gap - cardW - margin >= 0) {
        setPos({ top: clampY(cy), left: clampX(targetRect.left - gap - cardW) });
      } else {
        setPos({ top: clampY(vh - cardH - margin), left: clampX(cx) });
      }
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [targetRect, step.id, actionUnlocked]);

  useEffect(() => {
    cardRef.current?.focus();

    if (step.requireAction) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step.id, step.requireAction]);

  const xpPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const canClickNext = !step.requireAction || actionUnlocked;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      tabIndex={-1}
      className="fixed z-[95] w-[calc(100vw-2rem)] max-w-[360px] rounded-2xl border border-cyan-500/50 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3.5 focus:outline-none"
      style={{ top: pos.top, left: pos.left }}
    >
      <span className="sr-only" aria-live="polite">
        Step {stepIndex + 1} of {totalSteps}. Highlighting {step.title}. {step.body}
      </span>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span
            className={`w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-700 dark:text-cyan-300 text-xs font-bold ${skipAnimations ? '' : 'animate-bounce'
              }`}
            aria-hidden="true"
          >
            🛡️
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            aria-pressed={skipAnimations}
            onClick={onToggleSkipAnimations}
            className="min-h-[44px] px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {skipAnimations ? 'Animations: OFF' : 'Skip animations'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] px-2.5 py-1 rounded text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Skip
          </button>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Tutorial progress"
        aria-valuenow={xpPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${xpPercent}%` }}
        />
      </div>

      <div className="space-y-1.5">
        <h3 id="tour-step-title" className="text-sm font-bold text-slate-900 dark:text-white">
          {step.title}
        </h3>
        <p id="tour-step-desc" className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {step.body}
        </p>
      </div>

      {step.requireAction && (
        <div
          role="status"
          aria-live="polite"
          className={`px-3 py-2 rounded-xl border text-xs font-medium ${actionUnlocked
              ? 'bg-emerald-500/15 border-emerald-600/40 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-500/15 border-amber-600/40 text-amber-950 dark:text-amber-200'
            }`}
        >
          {actionUnlocked ? '✓ Action completed! Click Next to continue.' : step.actionHint}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={stepIndex === 0}
          className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canClickNext}
          className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:pointer-events-none"
        >
          {stepIndex === totalSteps - 1
            ? 'Finish →'
            : canClickNext
              ? 'Next →'
              : 'Complete action'}
        </button>
      </div>
    </div>
  );
};
