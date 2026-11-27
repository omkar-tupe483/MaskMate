import React, { useRef, useState } from 'react';
import { decodeAndValidateTextBytes, validateUploadedFileMeta } from '../lib/security.ts';

interface InputPanelProps {
  value: string;
  onChange: (val: string) => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  onFileLoaded: (content: string, fileName: string) => void;
  onErrorToast: (msg: string) => void;
  fileName: string | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  titleText: string;
  uploadLabel: string;
  sampleLabel: string;
  clearLabel: string;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  value,
  onChange,
  onLoadSample,
  onClearAll,
  onFileLoaded,
  onErrorToast,
  fileName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  titleText,
  uploadLabel,
  sampleLabel,
  clearLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const handleFile = (file: File) => {
    const metaCheck = validateUploadedFileMeta(file);
    if (!metaCheck.ok) {
      onErrorToast(metaCheck.error || 'Invalid file.');
      return;
    }

    setIsReading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setIsReading(false);
      const buffer = ev.target?.result;
      if (!(buffer instanceof ArrayBuffer)) {
        onErrorToast('Could not read file bytes safely.');
        return;
      }
      const decoded = decodeAndValidateTextBytes(buffer);
      if (!decoded.ok) {
        onErrorToast(decoded.error);
        return;
      }
      onFileLoaded(decoded.text, file.name);
    };
    reader.onerror = () => {
      setIsReading(false);
      onErrorToast('Failed to read the selected file.');
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <section
      data-tour="input-panel"
      aria-labelledby="input-panel-heading"
      className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" aria-hidden="true" />
          <h2
            id="input-panel-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {titleText}
          </h2>
          {fileName && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-300 border border-slate-300 dark:border-slate-700">
              {fileName}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            aria-label="Upload .txt or .csv file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo input change"
            title="Undo"
            className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            ↶
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo input change"
            title="Redo"
            className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            ↷
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
          >
            {uploadLabel}
          </button>

          <button
            type="button"
            data-tour="load-sample-btn"
            onClick={onLoadSample}
            className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/25 transition-colors"
          >
            {sampleLabel}
          </button>

          <button
            type="button"
            onClick={onClearAll}
            disabled={!value && !fileName}
            className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-400/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {clearLabel}
          </button>
        </div>
      </div>

      <div
        className={`relative flex-1 flex flex-col min-h-[260px] transition-colors ${
          isDragging ? 'bg-cyan-500/10 ring-2 ring-inset ring-cyan-400' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste raw text here, or drag and drop a .txt or .csv file (max 5 MB)..."
          aria-label="Raw text input for PII detection"
          className="w-full flex-1 p-4 bg-transparent font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none"
        />

        {isReading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center text-xs font-medium text-cyan-200"
          >
            Reading and validating file locally...
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center pointer-events-none text-sm font-semibold text-cyan-200">
            Drop .txt or .csv file to scan locally
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs font-mono text-slate-600 dark:text-slate-400 flex justify-between">
          <span>{value.length.toLocaleString()} chars</span>
          <span>{value ? value.split('\n').length.toLocaleString() : 0} lines</span>
        </div>
      </div>
    </section>
  );
};
