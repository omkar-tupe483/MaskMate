import React from 'react';
import { EntityType } from '../lib/types.js';
import { RedactionMode } from '../lib/redactors.js';

interface AuditPanelProps {
  totalEntities: number;
  typeCounts: Record<EntityType, number>;
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  currentMode: RedactionMode;
  processingTimeMs: number;
}

const TYPE_CONFIG: Record<EntityType, { label: string; badge: string; border: string }> = {
  EMAIL: { label: 'Email', badge: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30' },
  PHONE: { label: 'Phone', badge: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30' },
  IP: { label: 'IP Address', badge: 'bg-purple-500/20 text-purple-400', border: 'border-purple-500/30' },
  PAN: { label: 'PAN Card', badge: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30' },
  AADHAAR: { label: 'Aadhaar', badge: 'bg-teal-500/20 text-teal-400', border: 'border-teal-500/30' },
  CREDIT_CARD: { label: 'Credit Card', badge: 'bg-rose-500/20 text-rose-400', border: 'border-rose-500/30' },
};

export const AuditPanel: React.FC<AuditPanelProps> = ({
  totalEntities,
  typeCounts,
  rejectedLuhnCount,
  rejectedVerhoeffCount,
  currentMode,
  processingTimeMs,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-200">Audit & Validation Summary</h3>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-slate-400">
            Latency:{' '}
            <strong className="text-cyan-400 font-semibold">{processingTimeMs} ms</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">
            Mode: <strong className="text-cyan-400 font-semibold">{currentMode}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3 mt-3">
        {/* Total Found */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Entities</span>
          <span className="text-lg font-bold text-slate-100 mt-1 font-mono">{totalEntities}</span>
        </div>

        {/* Breakdown by Type */}
        {(Object.keys(TYPE_CONFIG) as EntityType[]).map((type) => {
          const config = TYPE_CONFIG[type];
          const count = typeCounts[type] || 0;
          return (
            <div
              key={type}
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                count > 0 ? `${config.badge} ${config.border}` : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
              }`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider truncate">{config.label}</span>
              <span className="text-lg font-bold mt-1 font-mono">{count}</span>
            </div>
          );
        })}

        {/* Rejected by Luhn */}
        <div className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/50 flex flex-col justify-between text-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider">Luhn Bait Rejected</span>
          </div>
          <span className="text-lg font-bold mt-1 font-mono text-amber-400">{rejectedLuhnCount}</span>
        </div>

        {/* Rejected by Verhoeff */}
        <div className="bg-teal-950/30 p-2.5 rounded-lg border border-teal-900/50 flex flex-col justify-between text-teal-300">
          <span className="text-[11px] font-medium uppercase tracking-wider">Verhoeff Rejected</span>
          <span className="text-lg font-bold mt-1 font-mono text-teal-400">{rejectedVerhoeffCount}</span>
        </div>
      </div>
    </div>
  );
};

