import React, { useRef, useState } from 'react';
import { Entity, EntityType } from '../lib/types.js';
import { RedactionResult } from '../lib/redactors.js';

interface DiffViewProps {
  originalText: string;
  detectedEntities: Entity[];
  redactionResult: RedactionResult;
}

// Styling classes for detected entities: color-blind accessible with background, border, and underline styling
const TYPE_STYLES: Record<EntityType, { bg: string; border: string; text: string; underline: string }> = {
  EMAIL: {
    bg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
    border: 'border-b-2 border-emerald-400',
    text: 'text-emerald-300',
    underline: 'decoration-emerald-400',
  },
  PHONE: {
    bg: 'bg-amber-500/20 hover:bg-amber-500/30',
    border: 'border-b-2 border-amber-400',
    text: 'text-amber-300',
    underline: 'decoration-amber-400',
  },
  IP: {
    bg: 'bg-purple-500/20 hover:bg-purple-500/30',
    border: 'border-b-2 border-purple-400',
    text: 'text-purple-300',
    underline: 'decoration-purple-400',
  },
  PAN: {
    bg: 'bg-blue-500/20 hover:bg-blue-500/30',
    border: 'border-b-2 border-blue-400',
    text: 'text-blue-300',
    underline: 'decoration-blue-400',
  },
  AADHAAR: {
    bg: 'bg-teal-500/20 hover:bg-teal-500/30',
    border: 'border-b-2 border-teal-400',
    text: 'text-teal-300',
    underline: 'decoration-teal-400',
  },
  CREDIT_CARD: {
    bg: 'bg-rose-500/20 hover:bg-rose-500/30',
    border: 'border-b-2 border-rose-400',
    text: 'text-rose-300',
    underline: 'decoration-rose-400',
  },
};

export const DiffView: React.FC<DiffViewProps> = ({
  originalText,
  detectedEntities,
  redactionResult,
}) => {
  const [hoveredEntityIdx, setHoveredEntityIdx] = useState<number | null>(null);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // Synchronized scrolling handler
  const handleLeftScroll = () => {
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    if (leftPaneRef.current && rightPaneRef.current) {
      isSyncingRight.current = true;
      const percentage =
        leftPaneRef.current.scrollTop /
        (leftPaneRef.current.scrollHeight - leftPaneRef.current.clientHeight || 1);
      rightPaneRef.current.scrollTop =
        percentage * (rightPaneRef.current.scrollHeight - rightPaneRef.current.clientHeight);
    }
  };

  const handleRightScroll = () => {
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    if (leftPaneRef.current && rightPaneRef.current) {
      isSyncingLeft.current = true;
      const percentage =
        rightPaneRef.current.scrollTop /
        (rightPaneRef.current.scrollHeight - rightPaneRef.current.clientHeight || 1);
      leftPaneRef.current.scrollTop =
        percentage * (leftPaneRef.current.scrollHeight - leftPaneRef.current.clientHeight);
    }
  };

  // Build rendered fragments for original text
  const renderOriginalSegments = () => {
    if (!originalText) {
      return <div className="text-slate-600 italic p-4">No text entered yet.</div>;
    }

    const segments: React.ReactNode[] = [];
    let lastIdx = 0;

    detectedEntities.forEach((entity, idx) => {
      if (entity.start > lastIdx) {
        segments.push(
          <span key={`orig-text-${lastIdx}-${entity.start}`}>
            {originalText.substring(lastIdx, entity.start)}
          </span>
        );
      }

      const style = TYPE_STYLES[entity.type];
      const isHovered = hoveredEntityIdx === idx;

      segments.push(
        <mark
          key={`orig-entity-${idx}`}
          onMouseEnter={() => setHoveredEntityIdx(idx)}
          onMouseLeave={() => setHoveredEntityIdx(null)}
          className={`cursor-pointer rounded-xs px-1 py-0.5 transition-all inline font-mono ${
            style.bg
          } ${style.border} ${style.text} ${
            isHovered ? 'ring-2 ring-white/90 scale-105 z-10 font-semibold' : ''
          }`}
          title={`${entity.type}: ${entity.value} (Confidence: ${Math.round(entity.confidence * 100)}%)`}
        >
          {originalText.substring(entity.start, entity.end)}
        </mark>
      );

      lastIdx = entity.end;
    });

    if (lastIdx < originalText.length) {
      segments.push(
        <span key={`orig-tail-${lastIdx}`}>
          {originalText.substring(lastIdx)}
        </span>
      );
    }

    return segments;
  };

  // Build rendered fragments for sanitized text
  const renderSanitizedSegments = () => {
    const { sanitizedText, sanitizedEntities } = redactionResult;
    if (!sanitizedText) {
      return <div className="text-slate-600 italic p-4">Sanitized output will appear here.</div>;
    }

    const segments: React.ReactNode[] = [];
    let lastIdx = 0;

    sanitizedEntities.forEach((item, idx) => {
      if (item.start > lastIdx) {
        segments.push(
          <span key={`sanit-text-${lastIdx}-${item.start}`}>
            {sanitizedText.substring(lastIdx, item.start)}
          </span>
        );
      }

      const entityType = item.originalEntity.type;
      const style = TYPE_STYLES[entityType];
      const isHovered = hoveredEntityIdx === idx;

      segments.push(
        <mark
          key={`sanit-entity-${idx}`}
          onMouseEnter={() => setHoveredEntityIdx(idx)}
          onMouseLeave={() => setHoveredEntityIdx(null)}
          className={`cursor-pointer rounded-xs px-1 py-0.5 transition-all inline font-mono ${
            style.bg
          } ${style.border} ${style.text} ${
            isHovered ? 'ring-2 ring-white/90 scale-105 z-10 font-semibold' : ''
          }`}
          title={`Redacted ${entityType} token`}
        >
          {item.replacement}
        </mark>
      );

      lastIdx = item.end;
    });

    if (lastIdx < sanitizedText.length) {
      segments.push(
        <span key={`sanit-tail-${lastIdx}`}>
          {sanitizedText.substring(lastIdx)}
        </span>
      );
    }

    return segments;
  };

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl gap-2 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Color & Border Pattern Legend:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TYPE_STYLES) as EntityType[]).map((type) => {
            const style = TYPE_STYLES[type];
            return (
              <span
                key={type}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono ${style.bg} ${style.border} ${style.text}`}
              >
                <span>{type}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Live Diff View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Original with Highlighted PII */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[520px]">
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Original Document (Highlighted PII)</span>
            </div>
            <span className="text-slate-500 font-mono">
              {detectedEntities.length} detected
            </span>
          </div>

          <div
            ref={leftPaneRef}
            onScroll={handleLeftScroll}
            className="flex-1 p-4 overflow-y-auto whitespace-pre-wrap font-mono text-xs md:text-sm text-slate-300 leading-relaxed select-text"
          >
            {renderOriginalSegments()}
          </div>
        </div>

        {/* Right: Sanitized with Highlighted Tokens */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[520px]">
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Sanitized Output (Replaced Tokens)</span>
            </div>
            <span className="text-slate-500 font-mono">
              {redactionResult.sanitizedEntities.length} redacted
            </span>
          </div>

          <div
            ref={rightPaneRef}
            onScroll={handleRightScroll}
            className="flex-1 p-4 overflow-y-auto whitespace-pre-wrap font-mono text-xs md:text-sm text-slate-300 leading-relaxed select-text"
          >
            {renderSanitizedSegments()}
          </div>
        </div>
      </div>
    </div>
  );
};
