import React, { useEffect, useRef } from 'react';
import { TiltedCard } from './TiltedCard.tsx';

interface WelcomeModalProps {
  onSelectYes: () => void;
  onSelectNo: () => void;
  onDismiss: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onSelectYes,
  onSelectNo,
  onDismiss,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const container = modalRef.current;
    const focusables = container?.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
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
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              100% Offline • Client-Side
            </span>
            <h2
              id="welcome-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
            >
              Do you know how to use MaskMate?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pick a quick 5-step summary or jump into the interactive walkthrough.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Skip onboarding"
            className="min-h-[44px] min-w-[44px] text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Skip
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TiltedCard
            onClick={onSelectYes}
            ariaLabel="Yes, I know — open quick summary"
            className="border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-slate-50 to-white dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950 p-5 shadow-lg hover:border-emerald-400"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-lg">
                ✓
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Yes, I know
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Show me the concise 5-step quick summary so I can start sanitizing right away.
              </p>
              <span className="inline-block text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                View Quick Summary →
              </span>
            </div>
          </TiltedCard>

          <TiltedCard
            onClick={onSelectNo}
            ariaLabel="No, teach me — start interactive tutorial"
            className="border border-cyan-500/50 bg-gradient-to-br from-cyan-500/15 via-slate-50 to-white dark:from-cyan-950/60 dark:via-slate-900 dark:to-slate-950 p-5 shadow-lg hover:border-cyan-400"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-700 dark:text-cyan-300 font-bold text-lg">
                ★
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No, teach me
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Launch the guided interactive tour with live spotlights and hands-on quests.
              </p>
              <span className="inline-block text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                Start Interactive Tour →
              </span>
            </div>
          </TiltedCard>
        </div>
      </div>
    </div>
  );
};

