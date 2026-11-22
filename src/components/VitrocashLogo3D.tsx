import React, { useId } from 'react';

interface VitrocashLogo3DProps {
  text?: string;
  variant?: 'splash' | 'header';
  sizePx?: number;
  glowEnabled?: boolean;
  reflectionEnabled?: boolean;
  animated?: boolean;
}

const SPLASH_EXTRUSION_LAYERS = [
  { x: 1, y: 1, color: '#B45309' },
  { x: 2, y: 2, color: '#92400E' },
  { x: 3, y: 3, color: '#78350F' },
  { x: 4, y: 4, color: '#4C1D95' },
  { x: 5, y: 5, color: '#2E1065' },
  { x: 6, y: 6, color: '#14082E' },
];

const HEADER_EXTRUSION_LAYERS = [
  { x: 0.8, y: 0.8, color: '#B45309' },
  { x: 1.6, y: 1.6, color: '#78350F' },
  { x: 2.4, y: 2.4, color: '#3B0764' },
  { x: 3.2, y: 3.2, color: '#14082E' },
];

export const VitrocashLogo3D: React.FC<VitrocashLogo3DProps> = ({
  text = 'VITROCASH',
  variant = 'splash',
  sizePx = 42,
  glowEnabled = true,
  reflectionEnabled = true,
  animated = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const isSplash = variant === 'splash';
  const layers = isSplash ? SPLASH_EXTRUSION_LAYERS : HEADER_EXTRUSION_LAYERS;

  const renderFacetedCrest = (crestSize: number) => (
    <svg
      width={crestSize}
      height={crestSize}
      viewBox="0 0 64 64"
      className="shrink-0 drop-shadow-[0_6px_14px_rgba(245,158,11,0.45)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`vc-crest-gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`vc-crest-dark-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B1A78" />
          <stop offset="100%" stopColor="#0D0620" />
        </linearGradient>
        <linearGradient id={`vc-crest-sky-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Extruded 3D shield base shadow */}
      <polygon
        points="32,6 58,20 52,48 32,61 12,48 6,20"
        fill="#451A03"
        transform="translate(0, 2.5)"
      />
      {/* Beveled gold outer frame */}
      <polygon
        points="32,4 58,18 52,46 32,59 12,46 6,18"
        fill={`url(#vc-crest-gold-${uid})`}
      />
      {/* Inner faceted dark-violet face */}
      <polygon
        points="32,9 52,20 47,43 32,53 17,43 12,20"
        fill={`url(#vc-crest-dark-${uid})`}
        stroke="#FDE68A"
        strokeWidth="1"
        strokeOpacity="0.65"
      />
      {/* 3D V Emblem (left facet brighter, right facet shaded) */}
      <polygon points="18,19 25,19 32,41 28,44" fill="#FEF08A" />
      <polygon points="46,19 39,19 32,41 36,44" fill="#D97706" />
      <polygon points="28,44 32,41 36,44 32,48" fill="#F59E0B" />
      {/* Crown electric-blue diamond */}
      <polygon points="32,12 37,18 32,24 27,18" fill={`url(#vc-crest-sky-${uid})`} />
    </svg>
  );

  if (!isSplash) {
    return (
      <span className="inline-flex items-center gap-2 select-none whitespace-nowrap shrink-0">
        {renderFacetedCrest(25)}
        <span
          className="relative inline-block font-display font-black tracking-[0.08em] text-[18px] leading-none"
          style={{ perspective: '420px' }}
        >
          {/* 3D extrusion depth stack */}
          {layers.map((layer, idx) => (
            <span
              key={idx}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                color: layer.color,
                transform: `translate(${layer.x}px, ${layer.y}px)`,
              }}
            >
              {text}
            </span>
          ))}
          {/* Top specular metallic gold-to-electric face */}
          <span
            className="relative z-10 inline-block text-transparent bg-clip-text"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #FFFBEB 0%, #FDE047 34%, #F59E0B 66%, #38BDF8 100%)',
              filter: glowEnabled
                ? 'drop-shadow(0 2px 6px rgba(251,191,36,0.35)) drop-shadow(0 4px 10px rgba(0,0,0,0.85))'
                : 'drop-shadow(0 3px 6px rgba(0,0,0,0.85))',
              transform: 'perspective(420px) rotateX(8deg)',
            }}
          >
            {text}
          </span>
        </span>
      </span>
    );
  }

  // Splash variant: dramatic 3D sculpted monument lockup
  const clampedFontSize = `clamp(28px, 9.2vw, ${sizePx}px)`;

  return (
    <div
      className="relative inline-flex flex-col items-center select-none"
      style={{ perspective: '900px' }}
    >
      {/* Ambient 3D backlight halo */}
      {glowEnabled && (
        <div
          className="absolute -inset-x-8 -inset-y-4 rounded-full blur-2xl pointer-events-none opacity-80"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(245,158,11,0.38) 0%, rgba(56,189,248,0.2) 48%, transparent 74%)',
          }}
        />
      )}

      {/* Faceted 3D Emblem Crest above wordmark */}
      <div
        className="relative z-10 mb-3"
        style={{ transform: 'perspective(700px) rotateX(10deg)' }}
      >
        {renderFacetedCrest(Math.round(Math.max(40, Math.min(68, sizePx * 1.15))))}
      </div>

      {/* 3D Extruded Wordmark */}
      <h1
        className="relative z-10 font-display font-black tracking-[0.13em] leading-none whitespace-nowrap"
        style={{
          fontSize: clampedFontSize,
          transform: 'perspective(700px) rotateX(14deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Deep 3D cast drop shadow */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none blur-[6px] opacity-80"
          style={{
            color: '#000000',
            transform: 'translate(8px, 10px)',
          }}
        >
          {text}
        </span>

        {/* Extruded solid 3D bevel slices */}
        {layers.map((layer, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              color: layer.color,
              transform: `translate(${layer.x}px, ${layer.y}px)`,
            }}
          >
            {text}
          </span>
        ))}

        {/* Highlighted 3D metallic front bevel face */}
        <span
          className="relative z-10 inline-block text-transparent bg-clip-text"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #FFFFFF 0%, #FEF08A 22%, #FBBF24 52%, #D97706 72%, #38BDF8 100%)',
            WebkitTextStroke: '0.6px rgba(254, 249, 195, 0.45)',
            filter: glowEnabled
              ? 'drop-shadow(0 0 18px rgba(251,191,36,0.4))'
              : undefined,
          }}
        >
          {text}
        </span>

        {/* Animated specular light reflection sweep across front face */}
        {reflectionEnabled && animated && (
          <span
            aria-hidden="true"
            className="absolute inset-0 z-20 pointer-events-none overflow-hidden text-transparent bg-clip-text animate-logo-glint"
            style={{
              backgroundImage:
                'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%)',
              backgroundSize: '220% 100%',
            }}
          >
            {text}
          </span>
        )}
      </h1>
    </div>
  );
};
