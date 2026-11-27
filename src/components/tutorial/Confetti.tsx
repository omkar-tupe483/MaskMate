import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  skipAnimations?: boolean;
  onFinish: () => void;
  onReplay: () => void;
}

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 41) % 100}%`,
  delay: `${(i * 73) % 600}ms`,
  duration: `${1600 + ((i * 197) % 900)}ms`,
  color: ['#22d3ee', '#34d399', '#60a5fa', '#fbbf24', '#f472b6'][i % 5],
}));

export const Confetti: React.FC<ConfettiProps> = ({
  skipAnimations = false,
  onFinish,
  onReplay,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[focusables.length - 1]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFinish();
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
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[105] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-complete-title"
    >
      {!skipAnimations && (
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="maskmate-confetti-piece absolute top-0 w-2.5 h-3.5 rounded-xs"
              style={{
                left: piece.left,
                backgroundColor: piece.color,
                animationDuration: piece.duration,
                animationDelay: piece.delay,
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/50 bg-white dark:bg-slate-900 p-7 text-center shadow-2xl space-y-5"
      >
        <div
          className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl"
          aria-hidden="true"
        >
          🎉
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40">
            Tutorial complete!
          </span>
          <h2
            id="tour-complete-title"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            You&apos;re Ready to Sanitize Safely
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            MaskMate keeps 100% of detection, checksum verification, and exports inside your browser.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onReplay}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Replay Tour
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25"
          >
            Start Using MaskMate
          </button>
        </div>
      </div>
    </div>
  );
};
