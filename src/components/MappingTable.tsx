import React, { useState } from 'react';
import { EntityType } from '../lib/types.js';

interface MappingTableProps {
  mappingTable: Map<string, { placeholder: string; type: EntityType; count: number }>;
}

export const MappingTable: React.FC<MappingTableProps> = ({ mappingTable }) => {
  const [hideOriginals, setHideOriginals] = useState<boolean>(true);

  const entries = Array.from(mappingTable.entries());

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-200">
              Pseudonymization Mapping Registry
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consistent tokens mapped across all repeated instances in this document.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={hideOriginals}
              onChange={(e) => setHideOriginals(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/50"
            />
            <span className="flex items-center space-x-1">
              <span>{hideOriginals ? '🔒 Hide Original Values (Recommended)' : '🔓 Show Original Values'}</span>
            </span>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Pseudonym Token</th>
              <th className="py-2 px-3">Occurrences</th>
              <th className="py-2 px-3">Original Raw Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {entries.map(([key, item]) => {
              // key format: "TYPE:normalizedValue"
              const rawVal = key.substring(key.indexOf(':') + 1);

              return (
                <tr key={key} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-cyan-400 font-semibold">{item.type}</td>
                  <td className="py-2 px-3">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 border border-slate-700 font-bold">
                      {item.placeholder}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{item.count}×</td>
                  <td className="py-2 px-3">
                    {hideOriginals ? (
                      <span className="text-slate-600 italic select-none">••••••••••••••••</span>
                    ) : (
                      <span className="text-rose-300 select-all">{rawVal}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

