import React, { useState, useMemo, useEffect } from 'react';
import { EntityType } from './lib/types.js';
import { detectPII } from './lib/detectors.js';
import { redactText, RedactionMode } from './lib/redactors.js';
import { SAMPLE_NOISY_TEXT } from './lib/sample.js';
import { InputPanel } from './components/InputPanel.js';
import { ModeSelector } from './components/ModeSelector.js';
import { DiffView } from './components/DiffView.js';
import { AuditPanel } from './components/AuditPanel.js';
import { MappingTable } from './components/MappingTable.js';
import { ExportBar } from './components/ExportBar.js';

const ALL_ENTITY_TYPES: EntityType[] = ['EMAIL', 'PHONE', 'IP', 'PAN', 'AADHAAR', 'CREDIT_CARD'];

export const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [debouncedText, setDebouncedText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redaction settings
  const [mode, setMode] = useState<RedactionMode>('FULL');
  const [includeTypeTagInFullMask, setIncludeTypeTagInFullMask] = useState<boolean>(true);
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(new Set(ALL_ENTITY_TYPES));

  // Debounce input ~150 ms to preserve snappy UI and avoid freezing on large input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(inputText);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Run detection engine via useMemo
  const detectionResult = useMemo(() => {
    if (!debouncedText) {
      return {
        entities: [],
        rejectedLuhnCount: 0,
        rejectedVerhoeffCount: 0,
        processingTimeMs: 0,
      };
    }
    return detectPII(debouncedText);
  }, [debouncedText]);

  // Run redaction engine via useMemo
  const redactionResult = useMemo(() => {
    return redactText(debouncedText, detectionResult.entities, {
      mode,
      includeTypeTagInFullMask,
      activeTypes,
    });
  }, [debouncedText, detectionResult.entities, mode, includeTypeTagInFullMask, activeTypes]);

  // Entity breakdown counts
  const typeCounts = useMemo(() => {
    const counts: Record<EntityType, number> = {
      EMAIL: 0,
      PHONE: 0,
      IP: 0,
      PAN: 0,
      AADHAAR: 0,
      CREDIT_CARD: 0,
    };
    for (const entity of detectionResult.entities) {
      counts[entity.type] = (counts[entity.type] || 0) + 1;
    }
    return counts;
  }, [detectionResult.entities]);

  // Handlers
  const handleLoadSample = () => {
    setInputText(SAMPLE_NOISY_TEXT);
    setUploadedFileName('sample_noisy_records.txt');
    setErrorMessage(null);
  };

  const handleClear = () => {
    setInputText('');
    setUploadedFileName(null);
    setErrorMessage(null);
  };

  const handleFileUpload = (content: string, fileName: string) => {
    setInputText(content);
    setUploadedFileName(fileName);
    setErrorMessage(null);
  };

  const handleToggleType = (type: EntityType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSelectAllTypes = () => {
    setActiveTypes(new Set(ALL_ENTITY_TYPES));
  };

  const handleDeselectAllTypes = () => {
    setActiveTypes(new Set());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-5 h-5 text-slate-950 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">MaskMate</h1>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 font-semibold px-2 py-0.5 rounded-full border border-cyan-800">
                  Client-Side PII
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Deterministic Client-Side Privacy Sanitizer</p>
            </div>
          </div>

          {/* Privacy badge guaranteed */}
          <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-700/60 px-3 py-1.5 rounded-full shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-300">
              Processed locally. Nothing leaves your browser
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Grid: Input Panel and Mode Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col">
            <InputPanel
              value={inputText}
              onChange={setInputText}
              onLoadSample={handleLoadSample}
              onClear={handleClear}
              onFileUpload={handleFileUpload}
              errorMessage={errorMessage}
              onClearError={() => setErrorMessage(null)}
              fileName={uploadedFileName}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <ModeSelector
              mode={mode}
              onModeChange={setMode}
              includeTypeTagInFullMask={includeTypeTagInFullMask}
              onToggleTypeTag={setIncludeTypeTagInFullMask}
              activeTypes={activeTypes}
              onToggleType={handleToggleType}
              onSelectAllTypes={handleSelectAllTypes}
              onDeselectAllTypes={handleDeselectAllTypes}
            />

            <ExportBar
              sanitizedText={redactionResult.sanitizedText}
              originalFileName={uploadedFileName}
              totalEntities={detectionResult.entities.length}
              typeCounts={typeCounts}
              rejectedLuhnCount={detectionResult.rejectedLuhnCount}
              rejectedVerhoeffCount={detectionResult.rejectedVerhoeffCount}
              currentMode={mode}
              processingTimeMs={detectionResult.processingTimeMs}
            />
          </div>
        </div>

        {/* Audit & Metrics Panel */}
        <AuditPanel
          totalEntities={detectionResult.entities.length}
          typeCounts={typeCounts}
          rejectedLuhnCount={detectionResult.rejectedLuhnCount}
          rejectedVerhoeffCount={detectionResult.rejectedVerhoeffCount}
          currentMode={mode}
          processingTimeMs={detectionResult.processingTimeMs}
        />

        {/* Live Side-by-Side Diff View */}
        <DiffView
          originalText={debouncedText}
          detectedEntities={detectionResult.entities}
          redactionResult={redactionResult}
        />

        {/* Pseudonym Mapping Table (Visible when in pseudonym mode or when mappings exist) */}
        {mode === 'PSEUDONYM' && (
          <MappingTable mappingTable={redactionResult.mappingTable} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>MaskMate — High-Performance Browser-Only PII Sanitizer. 100% Client-Side. CSP Verified (<code className="text-slate-400">connect-src &apos;none&apos;</code>).</p>
      </footer>
    </div>
  );
};

export default App;

