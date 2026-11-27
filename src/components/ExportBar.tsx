import React, { useState } from 'react';
import { EntityType } from '../lib/types.js';
import { RedactionMode } from '../lib/redactors.js';

interface ExportBarProps {
  sanitizedText: string;
  originalFileName?: string | null;
  totalEntities: number;
  typeCounts: Record<EntityType, number>;
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  currentMode: RedactionMode;
  processingTimeMs: number;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  sanitizedText,
  originalFileName,
  totalEntities,
  typeCounts,
  rejectedLuhnCount,
  rejectedVerhoeffCount,
  currentMode,
  processingTimeMs,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sanitizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = sanitizedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSanitized = () => {
    let ext = 'txt';
    let mimeType = 'text/plain;charset=utf-8';
    let baseName = 'document';

    if (originalFileName) {
      const parts = originalFileName.split('.');
      if (parts.length > 1) {
        ext = parts.pop() || 'txt';
        baseName = parts.join('.');
      } else {
        baseName = originalFileName;
      }
    }

    if (ext === 'csv') {
      mimeType = 'text/csv;charset=utf-8';
    }

    const blob = new Blob([sanitizedText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanitized_${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAuditReport = () => {
    // Pure metadata and counts - strictly NO raw PII values!
    const report = {
      app: 'MaskMate',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      privacyGuarantee: '100% Client-Side Execution. Zero external network transfer.',
      redactionMode: currentMode,
      metrics: {
        totalEntitiesDetected: totalEntities,
        countsByType: typeCounts,
        validationRejections: {
          rejectedLuhnCreditCardBait: rejectedLuhnCount,
          rejectedVerhoeffAadhaar: rejectedVerhoeffCount,
        },
        processingDurationMs: processingTimeMs,
      },
      fileDetails: {
        originalFileName: originalFileName || 'pasted-text',
        outputSizeCharacters: sanitizedText.length,
      },
    };

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maskmate_audit_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDisabled = !sanitizedText;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-200">Export & Actions</h4>
        <p className="text-xs text-slate-400">Save your sanitized document or compliance audit logs.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Copy to clipboard */}
        <button
          type="button"
          onClick={handleCopy}
          disabled={isDisabled}
          className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>

        {/* Download Sanitized File */}
        <button
          type="button"
          onClick={handleDownloadSanitized}
          disabled={isDisabled}
          className="px-3 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          <svg className="w-4 h-4 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download Sanitized File</span>
        </button>

        {/* Download Audit Report JSON */}
        <button
          type="button"
          onClick={handleDownloadAuditReport}
          disabled={isDisabled}
          className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none"
          title="Download JSON report without raw PII"
        >
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download Audit Report (JSON)</span>
        </button>
      </div>
    </div>
  );
};

