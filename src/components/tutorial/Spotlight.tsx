import React from 'react';

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface SpotlightProps {
  rect: SpotlightRect | null;
  allowCutoutInteraction: boolean;
  skipAnimations?: boolean;
}

export const Spotlight: React.FC<SpotlightProps> = ({
  rect,
  allowCutoutInteraction,
  skipAnimations = false,
}) => {
  const pad = 8;

  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-200"
        aria-hidden="true"
      />
    );
  }

  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const right = left + width;
  const bottom = top + height;

  return (
    <>
      {/* Visual SVG dimmed mask with rounded cutout */}
      <svg
        className="fixed inset-0 w-full h-full z-[90] pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <mask id="maskmate-tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={12}
              ry={12}
              fill="black"
              style={
                skipAnimations
                  ? undefined
                  : { transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)' }
              }
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.72)"
          mask="url(#maskmate-tour-spotlight-mask)"
        />
      </svg>

      {/* Pulsing highlight ring around target */}
      <div
        aria-hidden="true"
        className={`fixed z-[91] pointer-events-none rounded-xl border-2 border-cyan-400 ${
          skipAnimations ? '' : 'tour-spotlight-ring transition-all duration-200'
        }`}
        style={{ top, left, width, height }}
      />

      {/* Pointer blockers outside cutout (inside cutout remains clickable during action steps) */}
      {allowCutoutInteraction ? (
        <>
          <div className="fixed left-0 right-0 top-0 z-[90]" style={{ height: top }} aria-hidden="true" />
          <div className="fixed left-0 right-0 bottom-0 z-[90]" style={{ top: bottom }} aria-hidden="true" />
          <div
            className="fixed left-0 z-[90]"
            style={{ top, width: left, height }}
            aria-hidden="true"
          />
          <div
            className="fixed right-0 z-[90]"
            style={{ top, left: right, height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[90]" aria-hidden="true" />
      )}
    </>
  );
};

