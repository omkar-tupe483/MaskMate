import React, { memo, useMemo, useRef, useState } from 'react';
import type { DetectedEntity, EntityType } from '../lib/detectors.ts';
import type { RedactedReplacement } from '../lib/redactors.ts';

interface DiffViewProps {
  originalText: string;
  sanitizedText: string;
  entities: DetectedEntity[];
  replacements: RedactedReplacement[];
  activeTypes: ReadonlySet<EntityType>;
  ignoredIds: ReadonlySet<string>;
  onToggleIgnore: (id: string) => void;
  isProcessing: boolean;
  originalTitle: string;
  sanitizedTitle: string;
}

export const ENTITY_STYLE_MAP: Record<
  EntityType,
  { label: string; tag: string; highlight: string; chip: string; bar: string }
> = {
  EMAIL: {
    label: 'Email',
    tag: 'EM',
    highlight:
      'bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 border-b-2 border-solid border-emerald-600 dark:border-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-600/50 dark:border-emerald-400/50',
    bar: 'bg-emerald-600 dark:bg-emerald-400',
  },
  PHONE: {
    label: 'Phone',
    tag: 'PH',
    highlight:
      'bg-amber-500/20 text-amber-950 dark:text-amber-100 border-b-2 border-dashed border-amber-700 dark:border-amber-400',
    chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-600/50 dark:border-amber-400/50',
    bar: 'bg-amber-600 dark:bg-amber-400',
  },
  IP_ADDRESS: {
    label: 'IP Address',
    tag: 'IP',
    highlight:
      'bg-purple-500/20 text-purple-950 dark:text-purple-100 border-b-2 border-dotted border-purple-700 dark:border-purple-400',
    chip: 'bg-purple-500/15 text-purple-900 dark:text-purple-200 border-purple-600/50 dark:border-purple-400/50',
    bar: 'bg-purple-600 dark:bg-purple-400',
  },
  PAN: {
    label: 'PAN',
    tag: 'PN',
    highlight:
      'bg-blue-500/20 text-blue-950 dark:text-blue-100 border-b-2 border-solid border-blue-700 dark:border-blue-400',
    chip: 'bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-600/50 dark:border-blue-400/50',
    bar: 'bg-blue-600 dark:bg-blue-400',
  },
  AADHAAR: {
    label: 'Aadhaar',
    tag: 'AD',
    highlight:
      'bg-teal-500/20 text-teal-950 dark:text-teal-100 border-b-4 border-double border-teal-700 dark:border-teal-400',
    chip: 'bg-teal-500/15 text-teal-900 dark:text-teal-200 border-teal-600/50 dark:border-teal-400/50',
    bar: 'bg-teal-600 dark:bg-teal-400',
  },
  CREDIT_CARD: {
    label: 'Credit Card',
    tag: 'CC',
    highlight:
      'bg-rose-500/20 text-rose-950 dark:text-rose-100 border-b-2 border-solid border-rose-700 dark:border-rose-400',
    chip: 'bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-600/50 dark:border-rose-400/50',
    bar: 'bg-rose-600 dark:bg-rose-400',
  },
  CUSTOM: {
    label: 'Custom',
    tag: 'CU',
    highlight:
      'bg-cyan-500/20 text-cyan-950 dark:text-cyan-100 border-b-2 border-dashed border-cyan-700 dark:border-cyan-400',
    chip: 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border-cyan-600/50 dark:border-cyan-400/50',
    bar: 'bg-cyan-600 dark:bg-cyan-400',
  },
};

interface SpanItem {
  id: string;
  type: EntityType;
  start: number;
  end: number;
  text: string;
  label: string;
  active: boolean;
  ignored: boolean;
}

interface LineBucket {
  lineIndex: number;
  lineStart: number;
  lineText: string;
  spans: SpanItem[];
}

const LINE_HEIGHT_PX = 24;
const VIEWPORT_HEIGHT_PX = 420;
const OVERSCAN_LINES = 14;

function buildLineBuckets(text: string, spans: SpanItem[]): LineBucket[] {
  if (!text) return [];
  const rawLines = text.split('\n');
  const buckets: LineBucket[] = [];
  let offset = 0;
  let spanCursor = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const lineText = rawLines[i];
    const lineStart = offset;
    const lineEnd = lineStart + lineText.length;
    const lineSpans: SpanItem[] = [];

    while (spanCursor < spans.length && spans[spanCursor].end <= lineStart) {
      spanCursor += 1;
    }

    let j = spanCursor;
    while (j < spans.length && spans[j].start < lineEnd) {
      const s = spans[j];
      const clampedStart = Math.max(s.start, lineStart);
      const clampedEnd = Math.min(s.end, lineEnd);
      if (clampedEnd > clampedStart) {
        lineSpans.push({
          ...s,
          start: clampedStart - lineStart,
          end: clampedEnd - lineStart,
        });
      }
      if (s.end <= lineEnd) {
        j += 1;
      } else {
        break;
      }
    }

    buckets.push({
      lineIndex: i,
      lineStart,
      lineText,
      spans: lineSpans,
    });

    offset = lineEnd + 1; // +1 for '\n'
  }

  return buckets;
}

interface DiffLineProps {
  bucket: LineBucket;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onToggleIgnore?: (id: string) => void;
  isSanitizedPane: boolean;
}

const DiffLine = memo<DiffLineProps>(
  ({ bucket, hoveredId, onHover, onToggleIgnore, isSanitizedPane }) => {
    const { lineText, spans } = bucket;

    if (spans.length === 0) {
      return (
        <div
          className="h-[24px] leading-[24px] whitespace-pre overflow-hidden text-ellipsis"
          data-line={bucket.lineIndex}
        >
          {lineText || '\u00A0'}
        </div>
      );
    }

    const segments: React.ReactNode[] = [];
    let cursor = 0;

    for (let idx = 0; idx < spans.length; idx++) {
      const span = spans[idx];
      if (span.start > cursor) {
        segments.push(
          <span key={`t-${cursor}`}>{lineText.slice(cursor, span.start)}</span>
        );
      }

      const style = ENTITY_STYLE_MAP[span.type];
      const isHovered = hoveredId === span.id;
      const ariaName = `${style.label}${span.ignored ? ' (ignored)' : span.active ? '' : ' (excluded)'}: ${span.label}`;

      segments.push(
        <mark
          key={`m-${span.id}-${idx}`}
          role={!isSanitizedPane && onToggleIgnore ? 'button' : undefined}
          tabIndex={!isSanitizedPane && onToggleIgnore ? 0 : undefined}
          aria-pressed={!isSanitizedPane && onToggleIgnore ? span.ignored : undefined}
          aria-label={ariaName}
          onMouseEnter={() => onHover(span.id)}
          onMouseLeave={() => onHover(null)}
          onClick={!isSanitizedPane && onToggleIgnore ? () => onToggleIgnore(span.id) : undefined}
          onKeyDown={
            !isSanitizedPane && onToggleIgnore
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleIgnore(span.id);
                  }
                }
              : undefined
          }
          title={
            !isSanitizedPane
              ? `${style.label} — click to ${span.ignored ? 're-enable' : 'ignore'}`
              : `${style.label} replacement`
          }
          className={`inline rounded-xs px-1 font-mono cursor-pointer transition-colors ${
            span.ignored || !span.active
              ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-500 line-through'
              : style.highlight
          } ${isHovered ? 'ring-2 ring-cyan-500 font-bold' : ''}`}
        >
          <span className="text-[10px] font-bold opacity-75 mr-1 select-none" aria-hidden="true">
            [{style.tag}]
          </span>
          {lineText.slice(span.start, span.end)}
        </mark>
      );

      cursor = span.end;
    }

    if (cursor < lineText.length) {
      segments.push(<span key={`tail-${cursor}`}>{lineText.slice(cursor)}</span>);
    }

    return (
      <div
        className="h-[24px] leading-[24px] whitespace-pre overflow-hidden text-ellipsis"
        data-line={bucket.lineIndex}
      >
        {segments}
      </div>
    );
  }
);
DiffLine.displayName = 'DiffLine';

export const DiffView: React.FC<DiffViewProps> = ({
  originalText,
  sanitizedText,
  entities,
  replacements,
  activeTypes,
  ignoredIds,
  onToggleIgnore,
  isProcessing,
  originalTitle,
  sanitizedTitle,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef<'left' | 'right' | null>(null);

  const originalBuckets = useMemo(() => {
    const spans: SpanItem[] = entities.map((e) => ({
      id: e.id,
      type: e.type,
      start: e.start,
      end: e.end,
      text: e.value,
      label: e.value,
      active: activeTypes.has(e.type),
      ignored: ignoredIds.has(e.id),
    }));
    return buildLineBuckets(originalText, spans);
  }, [originalText, entities, activeTypes, ignoredIds]);

  const sanitizedBuckets = useMemo(() => {
    const spans: SpanItem[] = replacements.map((r) => ({
      id: r.id,
      type: r.originalEntity.type,
      start: r.start,
      end: r.end,
      text: r.replacement,
      label: r.replacement,
      active: true,
      ignored: false,
    }));
    return buildLineBuckets(sanitizedText, spans);
  }, [sanitizedText, replacements]);

  const handleScroll = (source: 'left' | 'right') => {
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (!from) return;

    setScrollTop(from.scrollTop);

    if (syncing.current && syncing.current !== source) {
      syncing.current = null;
      return;
    }
    if (!to) return;

    syncing.current = source;
    const maxFrom = Math.max(1, from.scrollHeight - from.clientHeight);
    const maxTo = Math.max(0, to.scrollHeight - to.clientHeight);
    to.scrollTop = (from.scrollTop / maxFrom) * maxTo;
  };

  const visibleCount = Math.ceil(VIEWPORT_HEIGHT_PX / LINE_HEIGHT_PX);
  const startLine = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT_PX) - OVERSCAN_LINES);
  const endLine = startLine + visibleCount + OVERSCAN_LINES * 2;

  const renderWindowedPane = (
    buckets: LineBucket[],
    isSanitizedPane: boolean,
    emptyLabel: string
  ) => {
    if (buckets.length === 0) {
      return (
        <p className="text-slate-500 dark:text-slate-400 italic text-xs sm:text-sm p-2">
          {emptyLabel}
        </p>
      );
    }

    const clampedEnd = Math.min(buckets.length, endLine);
    const visible = buckets.slice(startLine, clampedEnd);
    const topSpacer = startLine * LINE_HEIGHT_PX;
    const bottomSpacer = Math.max(0, (buckets.length - clampedEnd) * LINE_HEIGHT_PX);

    return (
      <div style={{ paddingTop: topSpacer, paddingBottom: bottomSpacer }}>
        {visible.map((bucket) => (
          <DiffLine
            key={`${isSanitizedPane ? 's' : 'o'}-${bucket.lineIndex}`}
            bucket={bucket}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onToggleIgnore={isSanitizedPane ? undefined : onToggleIgnore}
            isSanitizedPane={isSanitizedPane}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-3" aria-label="Side-by-side diff comparison">
      {/* Legend */}
      <div
        data-tour="diff-highlights"
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-sm text-xs"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Entity Legend (pattern + badge tag, click detection to ignore):
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(ENTITY_STYLE_MAP) as EntityType[]).map((type) => (
            <span
              key={type}
              className={`px-2 py-0.5 rounded border text-[11px] font-mono ${ENTITY_STYLE_MAP[type].chip}`}
            >
              [{ENTITY_STYLE_MAP[type].tag}] {ENTITY_STYLE_MAP[type].label}
            </span>
          ))}
        </div>
      </div>

      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 text-xs font-medium"
        >
          Processing in background Web Worker...
        </div>
      )}

      {/* Side-by-side virtualized diff panes */}
      <div data-tour="diff-view" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden flex flex-col h-[460px]">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100">
            <h3>{originalTitle}</h3>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {entities.length} detected
            </span>
          </div>
          <div
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            role="region"
            tabIndex={0}
            aria-label="Original document with highlighted PII"
            className="flex-1 px-4 py-2 overflow-auto font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100"
          >
            {renderWindowedPane(
              originalBuckets,
              false,
              'Paste text, upload a file, or click "Load Sample Noisy Text" to inspect detected PII.'
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden flex flex-col h-[460px]">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100">
            <h3>{sanitizedTitle}</h3>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {replacements.length} redacted
            </span>
          </div>
          <div
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            role="region"
            tabIndex={0}
            aria-label="Sanitized document output"
            className="flex-1 px-4 py-2 overflow-auto font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100"
          >
            {renderWindowedPane(
              sanitizedBuckets,
              true,
              'Sanitized output will appear here.'
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
