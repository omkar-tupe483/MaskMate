import React, { useState } from 'react';
import type { PseudonymEntry } from '../lib/pseudonymizer.ts';

interface PseudonymMapProps {
  entries: PseudonymEntry[];
  onDownloadMappingJson: () => void;
}

export const PseudonymMap: React.FC<PseudonymMapProps> = ({
  entries,
  onDownloadMappingJson,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [revealOriginals, setRevealOriginals] = useState(false);

  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="pseudonym-map-heading"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden transition-colors"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <h2 id="pseudonym-map-heading" className="text-sm font-semibold">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            className="min-h-[44px] px-2 flex items-center space-x-2 text-left text-slate-900 dark:text-slate-100 rounded-lg"
          >
            <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
            <span>Pseudonym Map ({entries.length})</span>
          </button>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-500/15 border border-amber-600/40 px-2.5 py-1.5 rounded-full font-medium">
            NOT included in sanitized download by default
          </span>

          <button
            type="button"
            aria-pressed={revealOriginals}
            onClick={() => setRevealOriginals((prev) => !prev)}
            className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
          >
            {revealOriginals ? 'Hide Originals' : 'Reveal Originals'}
          </button>

          <button
            type="button"
            onClick={onDownloadMappingJson}
            className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-600/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-900 dark:text-cyan-200"
          >
            Download Mapping JSON
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300">
                <th scope="col" className="py-2 px-4">Type</th>
                <th scope="col" className="py-2 px-4">Placeholder</th>
                <th scope="col" className="py-2 px-4">Occurrences</th>
                <th scope="col" className="py-2 px-4">Normalized Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {entries.map((entry) => (
                <tr key={entry.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 text-cyan-800 dark:text-cyan-300 font-semibold">
                    {entry.type}
                  </td>
                  <td className="py-2 px-4">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border border-cyan-600/30 font-bold">
                      {entry.placeholder}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-700 dark:text-slate-300">{entry.count}×</td>
                  <td className="py-2 px-4">
                    {revealOriginals ? (
                      <span className="text-rose-800 dark:text-rose-200">{entry.normalized}</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 select-none">
                        ••••••••••••
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
