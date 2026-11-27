import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { SAMPLE_NOISY_TEXT } from './lib/sample.ts';
import type { RedactionMode } from './lib/redactors.ts';
import { EN_TRANSLATIONS, type AppTranslations } from './i18n/en.ts';
import { useSanitizer } from './hooks/useSanitizer.ts';
import { useTutorial } from './hooks/useTutorial.ts';
import { Header } from './components/Header.tsx';
import { InputPanel } from './components/InputPanel.tsx';
import { ModeSwitch } from './components/ModeSwitch.tsx';
import { DiffView } from './components/DiffView.tsx';
import { AuditPanel } from './components/AuditPanel.tsx';
import { PseudonymMap } from './components/PseudonymMap.tsx';
import { ToastContainer, type ToastItem } from './components/Toast.tsx';
import type { SpotlightRect } from './components/tutorial/Spotlight.tsx';

const TutorialLayer = React.lazy(() => import('./components/tutorial/TutorialLayer.tsx'));
const CustomPatternsPanel = React.lazy(() => import('./components/CustomPatternsPanel.tsx'));

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = window.localStorage.getItem('maskmate.theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  } catch {
    // Ignore storage unavailability
  }
  return 'dark';
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('maskmate.hc') === 'true';
    } catch {
      return false;
    }
  });
  const [language, setLanguage] = useState<'en' | 'hi'>(() => {
    try {
      return window.localStorage.getItem('maskmate.lang') === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });
  const [hiTranslations, setHiTranslations] = useState<AppTranslations | null>(null);
  const t = language === 'hi' && hiTranslations ? hiTranslations : EN_TRANSLATIONS;
  const [skipAnimations, setSkipAnimations] = useState<boolean>(false);
  const [showCustomPatterns, setShowCustomPatterns] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  const sanitizer = useSanitizer();
  const tutorial = useTutorial();

  // Sync theme, high contrast, and document lang attribute
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem('maskmate.theme', theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast);
    try {
      window.localStorage.setItem('maskmate.hc', String(highContrast));
    } catch {
      // Ignore storage error
    }
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem('maskmate.lang', language);
    } catch {
      // Ignore storage error
    }
    if (language !== 'hi' || hiTranslations) {
      return undefined;
    }
    let active = true;
    import('./i18n/hi.ts').then((mod) => {
      if (active) setHiTranslations(mod.HI_TRANSLATIONS);
    });
    return () => {
      active = false;
    };
  }, [language, hiTranslations]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Measure target rect for spotlight walkthrough
  useEffect(() => {
    if (tutorial.phase !== 'walkthrough' || !tutorial.currentStep) {
      return undefined;
    }

    const selector = tutorial.currentStep.targetSelector;
    const targetEl = document.querySelector<HTMLElement>(selector);
    if (!targetEl) {
      const rafClear = window.requestAnimationFrame(() => setTargetRect(null));
      return () => window.cancelAnimationFrame(rafClear);
    }

    const reduced =
      skipAnimations || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    targetEl.scrollIntoView?.({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    const measure = () => {
      const r = targetEl.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      });
    };

    const raf = window.requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 240);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(targetEl);
    ro?.observe(document.body);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [tutorial.phase, tutorial.currentStep, skipAnimations]);

  const handleLoadSample = () => {
    sanitizer.loadText(SAMPLE_NOISY_TEXT, 'sample_noisy_data.txt');
    tutorial.markActionComplete('load-sample');
    addToast('Sample noisy text loaded and scanned locally.', 'success');
  };

  const handleFileLoaded = (content: string, name: string) => {
    sanitizer.loadText(content, name);
    addToast(`Loaded ${name} (${(content.length / 1024).toFixed(1)} KB) locally.`, 'success');
  };

  const handleModeChange = (nextMode: RedactionMode) => {
    sanitizer.setMode(nextMode);
    tutorial.recordModeTried(nextMode);
  };

  const handleClearAllData = () => {
    sanitizer.clearAll();
    addToast('All input, output, audit data, and pseudonym mappings cleared.', 'info');
  };

  const handleDownloadSanitized = () => {
    const content = sanitizer.isCsv ? sanitizer.safeExportText : sanitizer.sanitizedText;
    if (!content) return;
    const baseName = sanitizer.fileName || (sanitizer.isCsv ? 'document.csv' : 'document.txt');
    const outName = `sanitized_${baseName}`;
    const mime = sanitizer.isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${outName} locally.`, 'success');
  };

  const handleCopySanitized = async () => {
    if (!sanitizer.sanitizedText) return;
    try {
      await navigator.clipboard.writeText(sanitizer.sanitizedText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = sanitizer.sanitizedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    addToast('Sanitized text copied to clipboard.', 'success');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMappingJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      warning: 'SENSITIVE: Contains original normalized PII mappings. Keep local.',
      entries: sanitizer.pseudonymEntries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maskmate_pseudonym_map.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Downloaded Pseudonym Map JSON.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <a href="#main-content" className="skip-link">
        {t.skipToMain}
      </a>

      <Header
        theme={theme}
        highContrast={highContrast}
        language={language}
        showCustomPatterns={showCustomPatterns}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onToggleHighContrast={() => setHighContrast((prev) => !prev)}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'))}
        onToggleCustomPatterns={() => setShowCustomPatterns((prev) => !prev)}
        onClearAllData={handleClearAllData}
        onReplayTutorial={tutorial.replayTutorial}
        labels={t}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 focus:outline-none"
      >
        {showCustomPatterns && (
          <Suspense fallback={null}>
            <CustomPatternsPanel
              patterns={sanitizer.customPatterns}
              onAddPattern={sanitizer.addCustomPattern}
              onTogglePattern={sanitizer.toggleCustomPattern}
              onDeletePattern={sanitizer.deleteCustomPattern}
              workerError={sanitizer.customWorkerError}
            />
          </Suspense>
        )}

        {/* Input & Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <InputPanel
              value={sanitizer.rawText}
              onChange={sanitizer.setRawText}
              onLoadSample={handleLoadSample}
              onClearAll={handleClearAllData}
              onFileLoaded={handleFileLoaded}
              onErrorToast={(msg) => addToast(msg, 'error')}
              fileName={sanitizer.fileName}
              onUndo={sanitizer.undoInput}
              onRedo={sanitizer.redoInput}
              canUndo={sanitizer.canUndo}
              canRedo={sanitizer.canRedo}
              titleText={t.inputTitle}
              uploadLabel={t.uploadBtn}
              sampleLabel={t.loadSampleBtn}
              clearLabel={t.clearBtn}
            />
          </div>

          <div className="lg:col-span-5">
            <ModeSwitch
              mode={sanitizer.mode}
              onModeChange={handleModeChange}
              includeTypeTagInFullMask={sanitizer.includeTypeTagInFullMask}
              onToggleTypeTag={sanitizer.setIncludeTypeTagInFullMask}
              sanitizedText={sanitizer.sanitizedText}
              fileName={sanitizer.fileName}
              isCsv={sanitizer.isCsv}
              onDownloadSanitized={handleDownloadSanitized}
              onCopySanitized={handleCopySanitized}
              copied={copied}
            />
          </div>
        </div>

        {/* Virtualized Side-by-Side Diff View */}
        <DiffView
          originalText={sanitizer.originalForDiff}
          sanitizedText={sanitizer.sanitizedText}
          entities={sanitizer.entities}
          replacements={sanitizer.replacements}
          activeTypes={sanitizer.activeTypes}
          ignoredIds={sanitizer.ignoredIds}
          onToggleIgnore={sanitizer.toggleIgnoreEntity}
          isProcessing={sanitizer.isProcessing}
          originalTitle={t.diffOriginalTitle}
          sanitizedTitle={t.diffSanitizedTitle}
        />

        {/* Audit Dashboard */}
        <AuditPanel
          totalEntities={sanitizer.entities.length}
          countsByType={sanitizer.countsByType}
          activeTypes={sanitizer.activeTypes}
          ignoredCount={sanitizer.ignoredIds.size}
          onClearIgnored={sanitizer.clearIgnored}
          onToggleType={sanitizer.toggleType}
          onSelectAll={sanitizer.selectAllTypes}
          onDeselectAll={sanitizer.deselectAllTypes}
          rejectedLuhnCount={sanitizer.rejectedLuhnCount}
          rejectedVerhoeffCount={sanitizer.rejectedVerhoeffCount}
          processingTimeMs={sanitizer.processingTimeMs}
          skipAnimations={skipAnimations}
          totalLabel={t.totalEntities}
        />

        {/* Collapsible Pseudonym Map */}
        {(sanitizer.mode === 'PSEUDONYM' || sanitizer.pseudonymEntries.length > 0) && (
          <PseudonymMap
            entries={sanitizer.pseudonymEntries}
            onDownloadMappingJson={handleDownloadMappingJson}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <p>MaskMate — 100% Client-Side PII Sanitizer • Strict CSP (<code className="text-cyan-700 dark:text-cyan-300">connect-src &apos;none&apos;</code>)</p>
        <p>
          <a href="/privacy.html" className="underline hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded">Privacy Policy</a>
          {' · '}
          <a href="/terms.html" className="underline hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded">Terms of Service</a>
          {' · '}
          <span>© 2026 MaskMate Contributors · MIT License</span>
        </p>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {tutorial.phase !== 'idle' && (
        <Suspense fallback={null}>
          <TutorialLayer
            phase={tutorial.phase}
            currentStep={tutorial.currentStep}
            stepIndex={tutorial.stepIndex}
            totalSteps={tutorial.totalSteps}
            targetRect={tutorial.phase === 'walkthrough' ? targetRect : null}
            isCurrentActionComplete={tutorial.isCurrentActionComplete}
            skipAnimations={skipAnimations}
            onToggleSkipAnimations={() => setSkipAnimations((p) => !p)}
            onSelectYes={tutorial.chooseYes}
            onSelectNo={tutorial.chooseNo}
            onClose={tutorial.closeTutorial}
            onNext={tutorial.nextStep}
            onBack={tutorial.prevStep}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
