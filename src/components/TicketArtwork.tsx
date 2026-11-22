import React, { useState } from 'react';
import { TicketDefinition } from '../types/vitrocash';

interface TicketArtworkProps {
  ticket: TicketDefinition;
  size?: 'sm' | 'md' | 'lg';
}

function renderBespokeIllustration(key: string, accent: string) {
  switch (key) {
    case 'crown':
    case 'tiara':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M10 46 L14 20 L26 31 L32 14 L38 31 L50 20 L54 46 Z"
            fill={accent}
            fillOpacity="0.28"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="11" y="46" width="42" height="6" rx="2" fill={accent} />
          <circle cx="32" cy="12" r="3" fill="#FFFBEB" />
          <circle cx="14" cy="18" r="2.2" fill="#FFFBEB" />
          <circle cx="50" cy="18" r="2.2" fill="#FFFBEB" />
          <polygon points="32,32 36,38 32,43 28,38" fill="#38BDF8" />
        </svg>
      );
    case 'diamond':
    case 'crystal':
    case 'sapphire':
    case 'ruby':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <polygon
            points="20,14 44,14 54,27 32,52 10,27"
            fill={accent}
            fillOpacity="0.25"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polyline points="10,27 54,27" fill="none" stroke={accent} strokeWidth="2" />
          <polyline points="20,14 25,27 32,52 39,27 44,14" fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="2" fill="#FFFFFF" />
        </svg>
      );
    case 'chest':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M12 28 C12 18 52 18 52 28 Z" fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="2.2" />
          <rect x="12" y="28" width="40" height="22" rx="4" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="2.2" />
          <rect x="28" y="25" width="8" height="10" rx="2" fill={accent} />
          <circle cx="32" cy="30" r="1.8" fill="#0B0618" />
        </svg>
      );
    case 'moon':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M38 14 A18 18 0 1 0 50 44 A14 14 0 1 1 38 14 Z"
            fill={accent}
            fillOpacity="0.35"
            stroke={accent}
            strokeWidth="2.2"
          />
          <polygon points="46,16 48,21 53,21 49,24 50,29 46,26 42,29 43,24 39,21 44,21" fill="#FEF08A" />
          <circle cx="20" cy="18" r="1.8" fill="#FFFFFF" />
          <circle cx="48" cy="36" r="1.5" fill="#7DD3FC" />
        </svg>
      );
    case 'galaxy':
    case 'planet':
    case 'nebula':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="32" cy="32" r="12" fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="2.2" />
          <ellipse
            cx="32"
            cy="32"
            rx="24"
            ry="8"
            transform="rotate(-24 32 32)"
            fill="none"
            stroke="#7DD3FC"
            strokeWidth="2.2"
          />
          <circle cx="15" cy="16" r="1.8" fill="#FEF08A" />
          <circle cx="50" cy="46" r="2" fill="#FFFFFF" />
        </svg>
      );
    case 'compass':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="32" cy="32" r="20" fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="2.2" />
          <polygon points="32,14 37,32 32,50 27,32" fill={accent} fillOpacity="0.45" stroke={accent} strokeWidth="1.5" />
          <polygon points="32,14 36,32 28,32" fill="#FEF08A" />
          <circle cx="32" cy="32" r="3" fill="#0B0618" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'leaf':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M16 48 C16 24 32 14 50 14 C50 32 40 48 16 48 Z"
            fill={accent}
            fillOpacity="0.3"
            stroke={accent}
            strokeWidth="2.2"
          />
          <path d="M14 50 L42 22" stroke="#ECFDF5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'flame':
    case 'dragon':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M32 10 C40 22 48 27 46 39 C45 47 39 52 32 52 C23 52 18 46 18 38 C18 30 24 25 26 20 C28 24 31 24 32 10 Z"
            fill={accent}
            fillOpacity="0.35"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M32 28 C36 33 38 38 36 44 C34 47 30 47 28 43 C27 38 29 33 32 28 Z"
            fill="#FEF08A"
            fillOpacity="0.7"
          />
        </svg>
      );
    case 'key':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="22" cy="26" r="10" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="2.5" />
          <circle cx="22" cy="26" r="4" fill="#0B0618" />
          <path d="M30 32 L50 48 M43 42 L48 37 M47 46 L52 41" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'bolt':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <polygon
            points="35,10 18,34 31,34 27,54 46,28 33,28"
            fill={accent}
            fillOpacity="0.38"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'labyrinth':
    case 'castle':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M14 50 L14 24 L21 24 L21 30 L27 30 L27 18 L37 18 L37 30 L43 30 L43 24 L50 24 L50 50 Z"
            fill={accent}
            fillOpacity="0.28"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <rect x="28" y="38" width="8" height="12" rx="4" fill={accent} />
        </svg>
      );
    case 'eclipse':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="32" cy="32" r="18" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="2" />
          <circle cx="35" cy="32" r="14" fill="#0B0618" stroke="#FEF08A" strokeWidth="1.5" />
        </svg>
      );
    case 'pyramid':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <polygon points="32,14 52,48 12,48" fill={accent} fillOpacity="0.3" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
          <line x1="32" y1="14" x2="38" y2="48" stroke={accent} strokeOpacity="0.6" strokeWidth="1.5" />
          <circle cx="32" cy="34" r="4" fill="#FEF08A" />
        </svg>
      );
    case 'aurora':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M10 38 Q22 18 32 30 T54 22" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <path d="M10 46 Q24 28 34 38 T54 32" fill="none" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </svg>
      );
    case 'mask':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path
            d="M10 26 C18 18 46 18 54 26 C54 38 44 46 36 42 L32 38 L28 42 C20 46 10 38 10 26 Z"
            fill={accent}
            fillOpacity="0.3"
            stroke={accent}
            strokeWidth="2.2"
          />
          <ellipse cx="22" cy="30" rx="4" ry="2.5" fill="#0B0618" />
          <ellipse cx="42" cy="30" rx="4" ry="2.5" fill="#0B0618" />
        </svg>
      );
    case 'sword':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M48 14 L24 38 L20 34 L44 10 L52 10 Z" fill={accent} fillOpacity="0.38" stroke={accent} strokeWidth="2" />
          <path d="M16 32 L32 48 M21 41 L13 49" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <polygon
            points="32,12 37,25 51,25 40,33 44,47 32,39 20,47 24,33 13,25 27,25"
            fill={accent}
            fillOpacity="0.35"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="31" r="4" fill="#FEF08A" />
        </svg>
      );
  }
}

export const TicketArtwork: React.FC<TicketArtworkProps> = ({ ticket, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm' ? 'w-12 h-12 rounded-xl' : size === 'lg' ? 'w-20 h-20 rounded-2xl' : 'w-14 h-14 rounded-2xl';
  const pad = size === 'sm' ? 'p-1.5' : 'p-2';

  if (ticket.customImageUrl && !imgError) {
    return (
      <div
        className={`${dims} relative overflow-hidden shrink-0 border border-white/25 vc-icon-medallion`}
        style={{
          background: `linear-gradient(135deg, ${ticket.primaryColor}, ${ticket.secondaryColor})`,
        }}
      >
        <img
          src={ticket.customImageUrl}
          alt={ticket.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={`${dims} ${pad} relative overflow-hidden shrink-0 flex items-center justify-center border border-white/25 vc-icon-medallion`}
      style={{
        background: `radial-gradient(circle at 25% 20%, ${ticket.accentColor}48, transparent 62%), linear-gradient(145deg, ${ticket.primaryColor}, ${ticket.secondaryColor})`,
      }}
    >
      <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
      <div
        className="absolute inset-1 rounded-lg border opacity-35 pointer-events-none"
        style={{ borderColor: ticket.accentColor }}
      />
      <div className="relative z-10 w-full h-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
        {renderBespokeIllustration(ticket.illustrationKey, ticket.accentColor)}
      </div>
    </div>
  );
};
