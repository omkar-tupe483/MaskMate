import React from 'react';
import type { RedactionMode } from '../lib/redactors.ts';

interface ModeSwitchProps {
  mode: RedactionMode;
  onModeChange: (mode: RedactionMode) => void;
  includeTypeTagInFullMask: boolean;
  onToggleTypeTag: (checked: boolean) => void;
  sanitizedText: string;
  fileName: string | null;
  isCsv: boolean;
  onDownloadSanitized: () => void;
  onCopySanitized: () => void;
  copied: boolean;
}

const MODE_OPTIONS: Array<{ value: RedactionMode; label: string; hint: string }> = [
  { value: 'FULL', label: 'Full Mask', hint: 'Replaces sensitive spans with fixed [REDACTED] blocks.' },
  { value: 'PARTIAL', label: 'Partial Mask', hint: 'Keeps last 4 digits or domain hints for verification.' },
  {
    value: 'PSEUDONYM',
    label: 'Pseudonymize',
    hint: 'Maps normalized duplicates consistently to EMAIL_01, CARD_01, etc.',
  },
];

export const ModeSwitch: React.FC<ModeSwitchProps> = ({
  mode,
  onModeChange,
  includeTypeTagInFullMask,
  onToggleTypeTag,
  sanitizedText,
  fileName,
  isCsv,
  onDownloadSanitized,
  onCopySanitized,
  copied,
}) => {
  const activeHint = MODE_OPTIONS.find((m) => m.value === mode)?.hint ?? '';
  const hasOutput = sanitizedText.length > 0;
  const outputLabel = fileName
    ? `sanitized_${fileName}`
    : isCsv
      ? 'sanitized_document.csv'
      : 'sanitized_document.txt';

  return (
    <div className="flex flex-col justify-between gap-4 h-full">
      {/* Redaction Mode Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 shadow-xl space-y-4 transition-colors">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Redaction Mode
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeHint}</p>
        </div>

        <div
          data-tour="mode-switch"
          role="radiogroup"
          aria-label="Redaction mode"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800"
        >
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onModeChange(opt.value)}
                className={`min-h-[44px] px-2.5 py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {mode === 'FULL' && (
          <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={includeTypeTagInFullMask}
              onChange={(e) => onToggleTypeTag(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-cyan-500 focus:ring-cyan-400"
            />
            <span>
              Show entity tag (<code className="text-cyan-600 dark:text-cyan-300">[REDACTED:EMAIL]</code> vs{' '}
              <code className="text-cyan-600 dark:text-cyan-300">[REDACTED]</code>)
            </span>
          </label>
        )}

        {mode === 'PARTIAL' && (
          <div className="rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>Card: XXXX-XXXX-XXXX-1234</span>
            <span>PAN: ABCDE****F</span>
            <span>Email: j***@gmail.com</span>
            <span>IP: 192.168.*.*</span>
          </div>
        )}

        {mode === 'PSEUDONYM' && (
          <div className="rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-600 dark:text-slate-400">
            Normalized duplicates reuse the exact same token (<code className="text-cyan-600 dark:text-cyan-300">EMAIL_01</code>,{' '}
            <code className="text-cyan-600 dark:text-cyan-300">CARD_01</code>) across text and CSV cells.
          </div>
        )}
      </section>

      {/* Export Controls Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 shadow-xl space-y-3 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Export Sanitized Output
            </h2>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
              {outputLabel}
            </p>
          </div>
          {isCsv && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              CSV Structure Preserved
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-tour="download-btn"
            onClick={onDownloadSanitized}
            disabled={!hasOutput}
            className="flex-1 min-w-[170px] min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            Download Sanitized File
          </button>

          <button
            type="button"
            onClick={onCopySanitized}
            disabled={!hasOutput}
            className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </section>
    </div>
  );
};

