import React from 'react';
import { CoinModelId } from '../types/vitrocash';

interface CoinArtworkProps {
  model: CoinModelId;
  sizePx?: number;
  glowEnabled?: boolean;
  reflectionEnabled?: boolean;
  rotationSpeedSeconds?: number;
  rotationDirection?: 'normal' | 'reverse';
  animated?: boolean;
}

const MODEL_PALETTES: Record<
  CoinModelId,
  {
    rimLight: string;
    rimDark: string;
    faceInner: string;
    faceOuter: string;
    accent: string;
    glow: string;
    stroke: string;
  }
> = {
  imperial_gold: {
    rimLight: '#FEF08A',
    rimDark: '#B45309',
    faceInner: '#241242',
    faceOuter: '#0F0720',
    accent: '#FBBF24',
    glow: 'rgba(251, 191, 36, 0.45)',
    stroke: '#FDE68A',
  },
  electric_diamond: {
    rimLight: '#BAE6FD',
    rimDark: '#1D4ED8',
    faceInner: '#0A1A42',
    faceOuter: '#060B1E',
    accent: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.5)',
    stroke: '#7DD3FC',
  },
  violet_crystal: {
    rimLight: '#E9D5FF',
    rimDark: '#6D28D9',
    faceInner: '#2E1065',
    faceOuter: '#120529',
    accent: '#C084FC',
    glow: 'rgba(168, 85, 247, 0.5)',
    stroke: '#DDD6FE',
  },
  platinum_eclipse: {
    rimLight: '#F8FAFC',
    rimDark: '#475569',
    faceInner: '#1E293B',
    faceOuter: '#090D16',
    accent: '#F59E0B',
    glow: 'rgba(148, 163, 184, 0.4)',
    stroke: '#E2E8F0',
  },
};

export const CoinArtwork: React.FC<CoinArtworkProps> = ({
  model,
  sizePx = 160,
  glowEnabled = true,
  reflectionEnabled = true,
  rotationSpeedSeconds = 3.2,
  rotationDirection = 'normal',
  animated = true,
}) => {
  const pal = MODEL_PALETTES[model] ?? MODEL_PALETTES.imperial_gold;
  const uid = React.useId().replace(/:/g, '');

  const renderFaceSvg = (isBack: boolean) => (
    <svg viewBox="0 0 240 240" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id={`rim-${uid}-${isBack ? 'b' : 'f'}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={pal.rimLight} />
          <stop offset="50%" stopColor={pal.accent} />
          <stop offset="100%" stopColor={pal.rimDark} />
        </linearGradient>
        <radialGradient id={`face-${uid}-${isBack ? 'b' : 'f'}`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor={pal.faceInner} />
          <stop offset="100%" stopColor={pal.faceOuter} />
        </radialGradient>
        <linearGradient id={`emblem-${uid}-${isBack ? 'b' : 'f'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pal.rimLight} />
          <stop offset="100%" stopColor={pal.accent} />
        </linearGradient>
      </defs>

      <circle cx="120" cy="120" r="114" fill={`url(#rim-${uid}-${isBack ? 'b' : 'f'})`} />
      <circle
        cx="120"
        cy="120"
        r="102"
        fill="none"
        stroke={pal.rimDark}
        strokeWidth="2.5"
        strokeDasharray="6 6"
        opacity="0.7"
      />
      <circle
        cx="120"
        cy="120"
        r="95"
        fill={`url(#face-${uid}-${isBack ? 'b' : 'f'})`}
        stroke={pal.stroke}
        strokeWidth="3"
      />
      <circle cx="120" cy="120" r="82" fill="none" stroke={pal.accent} strokeWidth="1" opacity="0.45" />

      {isBack ? (
        <>
          <polygon
            points="120,64 150,120 120,176 90,120"
            fill={pal.accent}
            fillOpacity="0.22"
            stroke={`url(#emblem-${uid}-b)`}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <circle cx="120" cy="120" r="14" fill="#38BDF8" />
          <text
            x="120"
            y="192"
            textAnchor="middle"
            fill={pal.stroke}
            fontSize="11"
            fontWeight="700"
            letterSpacing="3"
            fontFamily="Outfit, sans-serif"
          >
            EDITION OR
          </text>
        </>
      ) : (
        <>
          <path
            d="M78 82 L120 162 L162 82"
            fill="none"
            stroke={`url(#emblem-${uid}-f)`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon points="120,54 128,66 120,78 112,66" fill="#38BDF8" />
          <text
            x="120"
            y="186"
            textAnchor="middle"
            fill={pal.stroke}
            fontSize="13"
            fontWeight="700"
            letterSpacing="3.5"
            fontFamily="Outfit, sans-serif"
          >
            VITROCASH
          </text>
        </>
      )}
    </svg>
  );

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: sizePx, height: sizePx, perspective: '900px' }}
    >
      {glowEnabled && (
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
          style={{ background: pal.glow, transform: 'scale(1.18)' }}
        />
      )}
      <div
        className={`relative w-full h-full ${animated ? 'animate-coin-spin' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          ...(animated
            ? ({
                '--coin-spin-duration': `${Math.max(0.8, rotationSpeedSeconds)}s`,
                animationDirection: rotationDirection,
              } as React.CSSProperties)
            : {}),
        }}
      >
        {/* Metallic Edge Mid-slice */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${pal.rimLight}, ${pal.rimDark})`,
            transform: 'translateZ(0px) scale(0.985)',
          }}
        />

        {/* Front Face */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'translateZ(4px)' }}
        >
          {renderFaceSvg(false)}
          {reflectionEnabled && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
            </div>
          )}
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(4px)' }}
        >
          {renderFaceSvg(true)}
          {reflectionEnabled && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
