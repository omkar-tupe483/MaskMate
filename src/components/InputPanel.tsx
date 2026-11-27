import React, { useRef } from 'react';

interface InputPanelProps {
  value: string;
  onChange: (val: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
  onFileUpload: (content: string, fileName: string) => void;
  errorMessage?: string | null;
  onClearError?: () => void;
  fileName?: string | null;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  value,
  onChange,
  onLoadSample,
  onClear,
  onFileUpload,
  errorMessage,
  onClearError,
  fileName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'csv') {
      alert(`Invalid file type: .${ext}. Only .txt and .csv files are supported.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileUpload(content, file.name);
    };
    reader.onerror = () => {
      alert('Failed to read file. Please ensure it is a valid text file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-200">Raw Input Document</h2>
          {fileName && (
            <span className="text-xs bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              {fileName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.csv"
            className="hidden"
            aria-label="Upload document file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center space-x-1"
            title="Upload .txt or .csv"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-lg transition-colors flex items-center space-x-1"
            title="Load realistic noisy text with PII edge-cases"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Load Sample Noisy Text</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-300 bg-slate-800/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title="Clear input"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800 px-4 py-2 text-xs text-red-200 flex justify-between items-center">
          <span>{errorMessage}</span>
          {onClearError && (
            <button onClick={onClearError} className="text-red-400 hover:text-red-100 text-sm font-bold">
              ×
            </button>
          )}
        </div>
      )}

      {/* Drag-and-drop / Textarea container */}
      <div
        className={`relative flex-1 flex flex-col min-h-[300px] transition-colors ${
          isDragging ? 'bg-cyan-950/20 border-2 border-dashed border-cyan-500' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste unstructured text, support tickets, medical notes, or logs here, or drag & drop a .txt/.csv file..."
          className="w-full flex-1 p-4 bg-transparent font-mono text-xs md:text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          spellCheck={false}
          aria-label="Input text for PII sanitization"
        />

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 pointer-events-none backdrop-blur-xs">
            <div className="text-cyan-400 font-medium flex items-center space-x-2">
              <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Drop .txt or .csv file to load</span>
            </div>
          </div>
        )}

        {/* Character and line count status bar */}
        <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between items-center font-mono">
          <span>{value.length.toLocaleString()} characters</span>
          <span>{value ? value.split('\n').length.toLocaleString() : 0} lines</span>
        </div>
      </div>
    </div>
  );
};

