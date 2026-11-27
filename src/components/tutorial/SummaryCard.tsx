import React, { useEffect, useRef } from 'react';
import { TiltedCard } from './TiltedCard.tsx';

interface SummaryCardProps {
  onGotIt: () => void;
  onStartTutorialAnyway: () => void;
}

const SUMMARY_STEPS = [
  { num: '1', title: 'Paste or upload', detail: 'Paste raw text, drop a .txt/.csv (max 5 MB), or load sample noisy data.' },
  { num: '2', title: 'Review detected PII', detail: 'Emails, phones, IPs, PAN, Verhoeff-checked Aadhaar, and Luhn-checked cards.' },
  { num: '3', title: 'Pick a redaction mode', detail: 'Switch live between Full Mask, Partial Mask, and Consistent Pseudonymization.' },
  { num: '4', title: 'Check diff & audit counts', detail: 'Compare side-by-side with synced scrolling, hover links, and per-type toggles.' },
  { num: '5', title: 'Download sanitized file', detail: 'Export sanitized .txt/.csv locally (CSV quoting preserved) or copy to clipboard.' },
];

export const SummaryCard: React.FC<SummaryCardProps> = ({
  onGotIt,
  onStartTutorialAnyway,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onGotIt();
        return;
      }
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prevFocus?.focus?.();
    };
  }, [onGotIt]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-card-title"
    >
      <div ref={dialogRef} className="w-full max-w-2xl my-auto">
        <TiltedCard
          maxTilt={5}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl"
        >
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
                  5-Step Quick Summary
                </span>
                <h2
                  id="summary-card-title"
                  className="text-xl font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  How MaskMate Works
                </h2>
              </div>
              <button
                type="button"
                onClick={onGotIt}
                aria-label="Close summary"
                className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-lg font-bold px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                ×
              </button>
            </div>

            <ol className="space-y-3">
              {SUMMARY_STEPS.map((step) => (
                <li
                  key={step.num}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60"
                >
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {step.num}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onStartTutorialAnyway}
                className="min-h-[44px] text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg px-2 py-1"
              >
                Show the tutorial anyway →
              </button>

              <button
                type="button"
                onClick={onGotIt}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                Got it
              </button>
            </div>
          </div>
        </TiltedCard>
      </div>
    </div>
  );
};

