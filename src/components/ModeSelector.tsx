import React from 'react';
import { RedactionMode } from '../lib/redactors.js';
import { EntityType } from '../lib/types.js';

interface ModeSelectorProps {
  mode: RedactionMode;
  onModeChange: (mode: RedactionMode) => void;
  includeTypeTagInFullMask: boolean;
  onToggleTypeTag: (val: boolean) => void;
  activeTypes: Set<EntityType>;
  onToggleType: (type: EntityType) => void;
  onSelectAllTypes: () => void;
  onDeselectAllTypes: () => void;
}

const ALL_TYPES: Array<{ type: EntityType; label: string; badgeColor: string }> = [
  { type: 'EMAIL', label: 'Email', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { type: 'PHONE', label: 'Phone', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { type: 'IP', label: 'IP Address', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { type: 'PAN', label: 'PAN Card', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { type: 'AADHAAR', label: 'Aadhaar (UIDAI)', badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { type: 'CREDIT_CARD', label: 'Credit Card (Luhn)', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
  includeTypeTagInFullMask,
  onToggleTypeTag,
  activeTypes,
  onToggleType,
  onSelectAllTypes,
  onDeselectAllTypes,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Redaction Mode Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Redaction Strategy</h3>
          <p className="text-xs text-slate-400">Choose how detected sensitive entities are transformed.</p>
        </div>

        <div className="inline-flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onModeChange('FULL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'FULL'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Full Mask
          </button>
          <button
            type="button"
            onClick={() => onModeChange('PARTIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'PARTIAL'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Partial Mask
          </button>
          <button
            type="button"
            onClick={() => onModeChange('PSEUDONYM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'PSEUDONYM'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Consistent Pseudonymization
          </button>
        </div>
      </div>

      {/* Mode Sub-options */}
      {mode === 'FULL' && (
        <div className="flex items-center space-x-2 pt-1 pb-1 text-xs text-slate-300">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTypeTagInFullMask}
              onChange={(e) => onToggleTypeTag(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/50"
            />
            <span>
              Include entity type identifier in placeholder (e.g.{' '}
              <span className="font-mono text-cyan-300">[REDACTED:EMAIL]</span> vs{' '}
              <span className="font-mono text-cyan-300">[REDACTED]</span>)
            </span>
          </label>
        </div>
      )}

      {mode === 'PARTIAL' && (
        <div className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/70 font-mono flex flex-wrap gap-x-4 gap-y-1">
          <span>Card: <span className="text-rose-300">XXXX-XXXX-XXXX-1234</span></span>
          <span>Aadhaar: <span className="text-teal-300">XXXX-XXXX-9012</span></span>
          <span>PAN: <span className="text-blue-300">ABXXXXXX4F</span></span>
          <span>Phone: <span className="text-amber-300">+91-XXXXXX3210</span></span>
          <span>Email: <span className="text-emerald-300">j***@domain.com</span></span>
          <span>IP: <span className="text-purple-300">192.168.XXX.XXX</span></span>
        </div>
      )}

      {mode === 'PSEUDONYM' && (
        <div className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/70">
          Normalized values consistently map to sequential identifiers (e.g., <span className="font-mono text-cyan-300">EMAIL_01</span>, <span className="font-mono text-cyan-300">PAN_01</span>). Repeated occurrences in any case or spacing reuse the identical pseudonym across the whole file.
        </div>
      )}

      {/* Per-Entity Type Filters */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Detect & Redact Entity Types:</span>
          <div className="space-x-2 text-[11px]">
            <button
              type="button"
              onClick={onSelectAllTypes}
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={onDeselectAllTypes}
              className="text-slate-400 hover:text-slate-300 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {ALL_TYPES.map(({ type, label, badgeColor }) => {
            const isActive = activeTypes.has(type);
            return (
              <label
                key={type}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                  isActive
                    ? `${badgeColor} bg-opacity-20 font-medium`
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggleType(type)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/50"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

