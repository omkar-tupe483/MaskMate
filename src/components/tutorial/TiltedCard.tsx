import React, { useRef, useState } from 'react';
import './TiltedCard.css';

interface TiltedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  maxTilt?: number;
  ariaLabel?: string;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  onClick,
  className = '',
  maxTilt = 10,
  ariaLabel,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / Math.max(1, rect.width);
    const py = (e.clientY - rect.top) / Math.max(1, rect.height);
    const ry = (px - 0.5) * 2 * maxTilt;
    const rx = -(py - 0.5) * 2 * maxTilt;
    setTilt({ rx, ry, gx: px * 100, gy: py * 100, hovered: true });
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  };

  const interactive = Boolean(onClick);

  return (
    <div
      ref={wrapRef}
      className="tilted-card-wrap"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={`tilted-card-body ${interactive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400' : ''} ${className}`}
        style={
          {
            transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) scale(${
              tilt.hovered && interactive ? 1.02 : 1
            })`,
            '--gx': `${tilt.gx.toFixed(1)}%`,
            '--gy': `${tilt.gy.toFixed(1)}%`,
          } as React.CSSProperties
        }
      >
        {children}
        <span className="tilted-card-glare" aria-hidden="true" />
      </div>
    </div>
  );
};

