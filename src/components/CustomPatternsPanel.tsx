import React, { useState } from 'react';
import type { CustomPatternDefinition } from '../lib/detectors.ts';
import { validateCustomRegexSyntax } from '../lib/security.ts';

interface CustomPatternsPanelProps {
  patterns: CustomPatternDefinition[];
  onAddPattern: (pattern: CustomPatternDefinition) => void;
  onTogglePattern: (id: string) => void;
  onDeletePattern: (id: string) => void;
  workerError: string | null;
}

export const CustomPatternsPanel: React.FC<CustomPatternsPanelProps> = ({
  patterns,
  onAddPattern,
  onTogglePattern,
  onDeletePattern,
  workerError,
}) => {
  const [label, setLabel] = useState('');
  const [patternText, setPatternText] = useState('');
  const [flags, setFlags] = useState('g');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim() || 'Custom Rule';
    const check = validateCustomRegexSyntax(patternText, flags);
    if (!check.valid) {
      setSyntaxError(check.error || 'Invalid regular expression.');
      return;
    }

    setSyntaxError(null);
    onAddPattern({
      id: `rule-${Date.now()}`,
      label: trimmedLabel,
      pattern: patternText,
      flags,
      enabled: true,
    });
    setLabel('');
    setPatternText('');
  };

  return (
    <section
      aria-labelledby="custom-patterns-heading"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-5 shadow-xl space-y-4 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="custom-patterns-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Custom Regex Patterns (Sandboxed Web Worker • 500 ms timeout)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Add custom regex rules. Executed safely in an isolated worker; only pattern definitions are stored locally.
          </p>
        </div>
      </div>

      {workerError && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200 text-xs font-medium"
        >
          {workerError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
        <div className="sm:col-span-3 space-y-1">
          <label
            htmlFor="custom-rule-label"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Label
          </label>
          <input
            id="custom-rule-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Employee ID"
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="sm:col-span-5 space-y-1">
          <label
            htmlFor="custom-rule-pattern"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Regex Pattern
          </label>
          <input
            id="custom-rule-pattern"
            type="text"
            value={patternText}
            onChange={(e) => {
              setPatternText(e.target.value);
              if (syntaxError) setSyntaxError(null);
            }}
            placeholder="e.g. EMP-\d{5}"
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="custom-rule-flags"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Flags
          </label>
          <input
            id="custom-rule-flags"
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="gi"
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm transition-colors"
          >
            Add Rule
          </button>
        </div>
      </form>

      {syntaxError && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {syntaxError}
        </p>
      )}

      {patterns.length > 0 && (
        <ul className="space-y-2">
          {patterns.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  aria-pressed={rule.enabled}
                  onClick={() => onTogglePattern(rule.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border font-semibold ${
                    rule.enabled
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                      : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {rule.enabled ? 'ON' : 'OFF'}
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {rule.label}
                </span>
                <code className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[260px]">
                  /{rule.pattern}/{rule.flags}
                </code>
              </div>

              <button
                type="button"
                aria-label={`Delete custom pattern ${rule.label}`}
                onClick={() => onDeletePattern(rule.id)}
                className="min-h-[44px] px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-medium"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CustomPatternsPanel;
