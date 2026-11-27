import React from 'react';

interface HeaderProps {
  theme: 'dark' | 'light';
  highContrast: boolean;
  language: 'en' | 'hi';
  showCustomPatterns: boolean;
  onToggleTheme: () => void;
  onToggleHighContrast: () => void;
  onToggleLanguage: () => void;
  onToggleCustomPatterns: () => void;
  onClearAllData: () => void;
  onReplayTutorial: () => void;
  labels: {
    subtitle: string;
    offlineBadge: string;
    clearAllData: string;
    replayTutorial: string;
    highContrast: string;
    customPatternsTitle: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  highContrast,
  language,
  showCustomPatterns,
  onToggleTheme,
  onToggleHighContrast,
  onToggleLanguage,
  onToggleCustomPatterns,
  onClearAllData,
  onReplayTutorial,
  labels,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand + Single H1 */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 p-1.5">
            <svg
              viewBox="0 0 64 64"
              className="w-full h-full text-slate-950"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M32 4L56 13V31C56 46 45 56 32 61C19 56 8 46 8 31V13L32 4ZM32 9L13 16V31C13 42 22 51 32 56C42 51 51 42 51 31V16L32 9Z"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16 24C16 21 21 20 26 22C29 23 30 25 32 25C34 25 35 23 38 22C43 20 48 21 48 24L46 32C45 35 41 36 37 35C34 35 33 33 32 33C31 33 30 35 27 35C23 36 19 35 18 32L16 24ZM20 27L21 31L28 32L29 28L20 27ZM44 27L35 28L36 32L43 31L44 27Z"
              />
              <rect x="22" y="40" width="20" height="4" rx="2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                MaskMate
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-600/30">
                Client-Side PII
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {labels.subtitle}
            </p>
          </div>
        </div>

        {/* Navigation / Utility Controls */}
        <nav aria-label="Application utilities" className="flex flex-wrap items-center gap-2">
          <div
            data-tour="privacy-badge"
            className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-600/40 px-3 py-2 rounded-full min-h-[44px]"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
              {labels.offlineBadge}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleLanguage}
            aria-pressed={language === 'hi'}
            aria-label={`Switch language (current: ${language === 'en' ? 'English' : 'Hindi'})`}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
          >
            {language === 'en' ? 'EN / हिं' : 'HI / EN'}
          </button>

          <button
            type="button"
            onClick={onToggleHighContrast}
            aria-pressed={highContrast}
            aria-label="Toggle high contrast mode"
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              highContrast
                ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {labels.highContrast}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>

          <button
            type="button"
            onClick={onToggleCustomPatterns}
            aria-pressed={showCustomPatterns}
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              showCustomPatterns
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-800 dark:text-cyan-200'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {labels.customPatternsTitle}
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-800 dark:text-rose-200 transition-colors"
          >
            {labels.clearAllData}
          </button>

          <button
            type="button"
            onClick={onReplayTutorial}
            aria-label="Replay tutorial"
            className="min-h-[44px] px-3 py-2 rounded-lg border border-cyan-600/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-900 dark:text-cyan-200 transition-colors"
          >
            {labels.replayTutorial}
          </button>
        </nav>
      </div>
    </header>
  );
};
