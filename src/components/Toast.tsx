import React from 'react';

export interface ToastItem {
  id: number;
  type: 'info' | 'success' | 'error';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => {
        const tone =
          toast.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-100'
            : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100'
              : 'bg-slate-900/95 border-cyan-500/40 text-slate-100';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium transition-all ${tone}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-current/70 hover:text-current font-bold px-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

