import React, { useEffect, useRef, useState } from 'react';
import type { EntityType } from '../lib/detectors.ts';
import { ALL_ENTITY_TYPES } from '../hooks/useSanitizer.ts';
import { ENTITY_STYLE_MAP } from './DiffView.tsx';

interface AuditPanelProps {
  totalEntities: number;
  countsByType: Record<EntityType, number>;
  activeTypes: ReadonlySet<EntityType>;
  ignoredCount: number;
  onClearIgnored: () => void;
  onToggleType: (type: EntityType) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  processingTimeMs: number;
  skipAnimations?: boolean;
  totalLabel: string;
}

function useAnimatedCount(target: number, skipAnimations: boolean): number {
  const prefersReduced =
    skipAnimations ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (prefersReduced) return undefined;

    const start = displayRef.current;
    if (start === target) return undefined;
    const t0 = performance.now();
    const duration = 260;
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, prefersReduced]);

  return prefersReduced ? target : display;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  totalEntities,
  countsByType,
  activeTypes,
  ignoredCount,
  onClearIgnored,
  onToggleType,
  onSelectAll,
  onDeselectAll,
  rejectedLuhnCount,
  rejectedVerhoeffCount,
  processingTimeMs,
  skipAnimations = false,
  totalLabel,
}) => {
  const animatedTotal = useAnimatedCount(totalEntities, skipAnimations);
  const maxTypeCount = Math.max(
    1,
    ...ALL_ENTITY_TYPES.map((type) => countsByType[type] || 0)
  );

  return (
    <section
      data-tour="audit-panel"
      aria-labelledby="audit-panel-heading"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-5 shadow-xl space-y-5 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-600/40">
            <h2
              id="audit-panel-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-cyan-900 dark:text-cyan-200"
            >
              {totalLabel}
            </h2>
            <div
              aria-live="polite"
              className="text-2xl font-bold font-mono text-slate-950 dark:text-white"
            >
              {animatedTotal}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-600/40 text-emerald-900 dark:text-emerald-200 font-mono">
              Luhn: {rejectedLuhnCount} decoy{rejectedLuhnCount === 1 ? '' : 's'} rejected
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-600/40 text-teal-900 dark:text-teal-200 font-mono">
              Verhoeff: {rejectedVerhoeffCount} invalid rejected
            </span>
            {ignoredCount > 0 && (
              <button
                type="button"
                onClick={onClearIgnored}
                className="min-h-[44px] px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-semibold hover:bg-amber-500/20"
              >
                Restore {ignoredCount} ignored
              </button>
            )}
          </div>
        </div>

        <div aria-live="polite" className="text-xs font-mono text-slate-600 dark:text-slate-300">
          Processed in <strong className="text-cyan-800 dark:text-cyan-300">{processingTimeMs} ms</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div data-tour="entity-toggles" className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Entity Type Toggles ({activeTypes.size}/{ALL_ENTITY_TYPES.length} active)
            </h3>
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={onSelectAll}
                className="min-h-[44px] px-2 text-cyan-800 dark:text-cyan-300 hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-slate-400" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={onDeselectAll}
                className="min-h-[44px] px-2 text-slate-600 dark:text-slate-300 hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_ENTITY_TYPES.map((type) => {
              const active = activeTypes.has(type);
              const count = countsByType[type] || 0;
              const style = ENTITY_STYLE_MAP[type];
              return (
                <label
                  key={type}
                  className={`min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer select-none transition-colors ${
                    active
                      ? `${style.chip} font-semibold`
                      : 'bg-slate-100/80 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleType(type)}
                      className="w-4 h-4 rounded border-slate-400 dark:border-slate-600 text-cyan-600"
                    />
                    <span className="whitespace-nowrap">{style.label}</span>
                  </div>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-black/30">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Detection Breakdown
          </h3>
          <div className="space-y-2">
            {ALL_ENTITY_TYPES.map((type) => {
              const count = countsByType[type] || 0;
              const pct = totalEntities > 0 ? Math.round((count / maxTypeCount) * 100) : 0;
              const style = ENTITY_STYLE_MAP[type];
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <span>{style.label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
