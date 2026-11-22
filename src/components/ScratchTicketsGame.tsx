import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, Clock, Eye, Info, Sparkles, Swords, Ticket } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { TICKET_MECHANIC_META } from '../data/defaults';
import { formatEuro } from '../engine/rng';
import {
  generateScratchBoard,
  resolveTicketMechanic,
  ScratchBoardData,
} from '../engine/scratchBoard';
import {
  ActivityQuotaState,
  AnimationConfig,
  SoundConfig,
  TicketBatchState,
  TicketDefinition,
  TicketInstance,
  TicketMechanic,
} from '../types/vitrocash';
import { TicketArtwork } from './TicketArtwork';

interface ScratchTicketsGameProps {
  batch: TicketBatchState | null;
  quota: ActivityQuotaState;
  catalog: TicketDefinition[];
  sounds: SoundConfig;
  animations: AnimationConfig;
  now: number;
  onStartScratch: (instanceId: string) => void;
  onCompleteScratch: (instanceId: string) => void;
}

function formatCountdown(targetMs: number | null, now: number): string {
  if (!targetMs) return 'Après utilisation des 3 tickets';
  const diff = Math.max(0, Math.floor((targetMs - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const ScratchTicketsGame: React.FC<ScratchTicketsGameProps> = ({
  batch,
  quota,
  catalog,
  sounds,
  animations,
  now,
  onStartScratch,
  onCompleteScratch,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProbabilities, setShowProbabilities] = useState(false);

  const items = batch?.items ?? [];

  useEffect(() => {
    if (!selectedId || !items.some((i) => i.instanceId === selectedId)) {
      const nextUnrevealed = items.find((i) => i.status !== 'REVEALED');
      setSelectedId(nextUnrevealed?.instanceId ?? items[0]?.instanceId ?? null);
    }
  }, [items, selectedId]);

  const activeInstance = items.find((i) => i.instanceId === selectedId) ?? null;
  const activeDef = useMemo(() => {
    if (!activeInstance) return null;
    return catalog.find((t) => t.id === activeInstance.ticketId) ?? null;
  }, [activeInstance, catalog]);

  return (
    <div className="space-y-4">
      {/* Header status strip */}
      <div className="rounded-2xl vc-card-relief p-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">Tickets à Gratter</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-mono-tabular shrink-0">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{formatCountdown(quota.nextRenewalAt, now)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {quota.remaining} / {quota.maxAttempts} disponibles · 3 tickets toutes les {quota.intervalHours} h
        </p>
      </div>

      {/* 3 Distinct Ticket Selector Cards */}
      <div className="grid grid-cols-1 gap-2">
        {items.map((inst) => {
          const def = catalog.find((t) => t.id === inst.ticketId);
          const mech = resolveTicketMechanic(def ?? { id: inst.ticketId });
          const mechMeta = TICKET_MECHANIC_META[mech];
          const isSelected = inst.instanceId === activeInstance?.instanceId;
          const isRevealed = inst.status === 'REVEALED';
          const isWin = isRevealed && inst.rewardAmount > 0;

          return (
            <button
              key={inst.instanceId}
              type="button"
              onClick={() => {
                soundEngine.playTap(sounds);
                setSelectedId(inst.instanceId);
              }}
              className={`relative overflow-hidden text-left rounded-2xl px-3 py-2.5 transition-all cursor-pointer min-h-[64px] flex items-center gap-3 ${
                isSelected
                  ? 'bg-gradient-to-br from-[#281754] to-[#160D32] border-[1.5px] border-amber-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_22px_-8px_rgba(251,191,36,0.35)]'
                  : 'vc-card-relief hover:border-amber-300/80'
              }`}
            >
              {def ? (
                <TicketArtwork ticket={def} size="sm" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-violet-950 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-sm text-white truncate">
                    {inst.ticketName}
                  </div>
                  <div className="text-[11px] tabular-nums shrink-0">
                    {isRevealed ? (
                      <span className={isWin ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                        {formatEuro(inst.rewardAmount)}
                      </span>
                    ) : inst.status === 'SCRATCHING' ? (
                      <span className="text-sky-300 font-medium">En cours</span>
                    ) : (
                      <span className="text-violet-300 font-medium">Prêt</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {mechMeta.shortLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Scratch Arena */}
      {activeInstance && (
        <ScratchArenaCard
          key={activeInstance.instanceId}
          instance={activeInstance}
          definition={activeDef}
          sounds={sounds}
          animations={animations}
          onStartScratch={onStartScratch}
          onCompleteScratch={onCompleteScratch}
        />
      )}

      {/* Probabilities Disclosure */}
      {activeDef && (
        <div className="rounded-2xl vc-card-relief overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProbabilities((v) => !v)}
            className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
          >
            <span className="inline-flex items-center gap-2 min-w-0 truncate">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">Gains et probabilités · {activeDef.name}</span>
            </span>
            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
              {showProbabilities ? 'Masquer' : 'Afficher'}
            </span>
          </button>
          {showProbabilities && (
            <div className="px-3.5 pb-3.5 pt-2 grid grid-cols-2 gap-2 border-t border-white/10">
              {activeDef.probabilities.map((tier) => (
                <div
                  key={tier.id}
                  className="rounded-xl bg-black/30 px-3 py-2 flex items-center justify-between text-xs tabular-nums"
                >
                  <span className="font-semibold text-amber-300">{formatEuro(tier.amount)}</span>
                  <span className="text-slate-300">{tier.probability.toString().replace('.', ',')} %</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ScratchArenaCardProps {
  instance: TicketInstance;
  definition: TicketDefinition | null;
  sounds: SoundConfig;
  animations: AnimationConfig;
  onStartScratch: (instanceId: string) => void;
  onCompleteScratch: (instanceId: string) => void;
}

function drawEtchedZoneBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  accent: string,
  radius = 12,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, w - 6, h - 6, Math.max(4, radius - 3));
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.38;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 12px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}

function drawMechanicFoil(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mechanic: TicketMechanic,
  accent: string,
) {
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#94A3B8');
  grad.addColorStop(0.24, '#E2E8F0');
  grad.addColorStop(0.5, '#9CA3AF');
  grad.addColorStop(0.76, '#E5E7EB');
  grad.addColorStop(1, '#64748B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle metallic cross-hatch
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  // Accent shimmer band
  const tint = ctx.createLinearGradient(0, 0, w, 0);
  tint.addColorStop(0, 'transparent');
  tint.addColorStop(0.5, `${accent}26`);
  tint.addColorStop(1, 'transparent');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);

  const padX = 24;
  const topY = 40;
  const usableW = w - padX * 2;
  const usableH = h - topY - 26;

  // Etch zone outlines specific to the ticket game mechanic
  if (mechanic === 'vault_duo') {
    const gap = 14;
    const boxW = (usableW - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      drawEtchedZoneBox(ctx, padX + i * (boxW + gap), topY + 20, boxW, usableH - 36, `COFFRE ${i + 1}`, accent, 16);
    }
  } else if (mechanic === 'fetiche_numbers') {
    drawEtchedZoneBox(ctx, padX + 70, topY, usableW - 140, 54, 'NUMÉROS FÉTICHES', accent, 14);
    const cols = 3;
    const rows = 2;
    const gap = 12;
    const cellW = (usableW - gap * (cols - 1)) / cols;
    const cellH = (usableH - 66 - gap) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c + 1;
        drawEtchedZoneBox(
          ctx,
          padX + c * (cellW + gap),
          topY + 66 + r * (cellH + gap),
          cellW,
          cellH,
          `CASE ${idx}`,
          accent,
          12,
        );
      }
    }
  } else if (mechanic === 'celestial_signs') {
    const leftW = 135;
    const rightW = 125;
    const midW = usableW - leftW - rightW - 24;
    drawEtchedZoneBox(ctx, padX, topY + 12, leftW, usableH - 24, 'SIGNE MAÎTRE', accent, 14);
    const gap = 10;
    const orbW = (midW - gap) / 2;
    const orbH = (usableH - 24 - gap) / 2;
    for (let i = 0; i < 4; i++) {
      const r = Math.floor(i / 2);
      const c = i % 2;
      drawEtchedZoneBox(
        ctx,
        padX + leftW + 12 + c * (orbW + gap),
        topY + 12 + r * (orbH + gap),
        orbW,
        orbH,
        `ORBE ${i + 1}`,
        accent,
        14,
      );
    }
    drawEtchedZoneBox(ctx, padX + leftW + 24 + midW, topY + 12, rightW, usableH - 24, 'GAIN ASTRAL', accent, 14);
  } else if (mechanic === 'duel_match') {
    const gap = 10;
    const rowH = (usableH - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      drawEtchedZoneBox(
        ctx,
        padX,
        topY + i * (rowH + gap),
        usableW,
        rowH,
        `MANCHE ${i + 1} · SCORE VS ADVERSAIRE`,
        accent,
        12,
      );
    }
  } else if (mechanic === 'trio_symbols') {
    const gridW = usableW - 146;
    const gap = 8;
    const cellW = (gridW - gap * 2) / 3;
    const cellH = (usableH - gap * 2) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        drawEtchedZoneBox(
          ctx,
          padX + c * (cellW + gap),
          topY + r * (cellH + gap),
          cellW,
          cellH,
          '★',
          accent,
          10,
        );
      }
    }
    drawEtchedZoneBox(ctx, padX + gridW + 14, topY, 132, usableH, 'GAIN TRÉSOR', accent, 16);
  } else {
    // treasure_cascade
    const multW = 128;
    const gridW = usableW - multW - 14;
    const gap = 10;
    const cellW = (gridW - gap) / 2;
    const cellH = (usableH - gap) / 2;
    for (let i = 0; i < 4; i++) {
      const r = Math.floor(i / 2);
      const c = i % 2;
      drawEtchedZoneBox(
        ctx,
        padX + c * (cellW + gap),
        topY + r * (cellH + gap),
        cellW,
        cellH,
        `RELIQUE ${i + 1}`,
        accent,
        12,
      );
    }
    drawEtchedZoneBox(ctx, padX + gridW + 14, topY, multW, usableH, 'BONUS × ?', accent, 16);
  }

  // Header foil prompt
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 13px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRATTEZ AU DOIGT POUR DÉCOUVRIR', w / 2, 20);

  ctx.fillStyle = '#334155';
  ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
  ctx.fillText('1 seul grattage par ticket · Crédits fictifs', w / 2, h - 12);
}

const ScratchArenaCard: React.FC<ScratchArenaCardProps> = ({
  instance,
  definition,
  sounds,
  animations,
  onStartScratch,
  onCompleteScratch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const startedRef = useRef(instance.status !== 'READY');
  const completedRef = useRef(instance.status === 'REVEALED');
  const strokeCountRef = useRef(0);

  const [scratchPercent, setScratchPercent] = useState(instance.status === 'REVEALED' ? 100 : 0);

  const primary = definition?.primaryColor ?? '#1D123D';
  const secondary = definition?.secondaryColor ?? '#3B0764';
  const accent = definition?.accentColor ?? '#FBBF24';

  const mechanic = resolveTicketMechanic(definition ?? { id: instance.ticketId });
  const mechanicMeta = TICKET_MECHANIC_META[mechanic];

  const board = useMemo(
    () => generateScratchBoard(instance, definition),
    [instance, definition],
  );

  const drawFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || instance.status === 'REVEALED') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawMechanicFoil(ctx, canvas.width, canvas.height, mechanic, accent);
  }, [accent, instance.status, mechanic]);

  useEffect(() => {
    drawFoil();
  }, [drawFoil]);

  const measureScratchedRatio = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const step = 16;
    let totalSamples = 0;
    for (let i = 3; i < img.length; i += step) {
      totalSamples++;
      if (img[i] < 40) transparent++;
    }
    return totalSamples > 0 ? Math.round((transparent / totalSamples) * 100) : 0;
  }, []);

  const triggerReveal = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setScratchPercent(100);
    onCompleteScratch(instance.instanceId);
    if (instance.rewardAmount > 0) {
      soundEngine.playWin(sounds, instance.rewardAmount >= 0.2);
      soundEngine.triggerHaptic(animations, [25, 40, 60]);
    } else {
      soundEngine.playZero(sounds, 'tickets');
    }
  }, [animations, instance.instanceId, instance.rewardAmount, onCompleteScratch, sounds]);

  const eraseAt = (clientX: number, clientY: number) => {
    if (completedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    if (!startedRef.current) {
      startedRef.current = true;
      onStartScratch(instance.instanceId);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 46;

    ctx.beginPath();
    if (lastPointRef.current) {
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    } else {
      ctx.moveTo(x - 0.5, y - 0.5);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };

    soundEngine.playScratchTick(sounds);
    strokeCountRef.current += 1;

    if (strokeCountRef.current % 6 === 0) {
      const pct = measureScratchedRatio();
      setScratchPercent(pct);
      if (pct >= 58) {
        triggerReveal();
      }
    }
  };

  const isRevealed = instance.status === 'REVEALED';
  const isWin = instance.rewardAmount > 0;

  return (
    <div
      className="rounded-3xl border-[1.5px] border-amber-400/65 p-4 relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 82% 8%, ${accent}38, transparent 52%), radial-gradient(circle at 12% 90%, rgba(56,189,248,0.18), transparent 48%), linear-gradient(150deg, ${primary}, ${secondary})`,
        boxShadow:
          'inset 0 1px 1px rgba(254,243,199,0.35), inset 0 -3px 0 rgba(0,0,0,0.45), 0 24px 48px -12px rgba(3,1,12,0.9), 0 0 28px -6px rgba(245,158,11,0.28)',
      }}
    >
      <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />

      {/* Ticket Header */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        {definition && <TicketArtwork ticket={definition} size="md" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-200/80 truncate">
            {definition?.theme ?? 'Ticket Édition'} · {mechanicMeta.shortLabel}
          </p>
          <h3 className="font-display text-xl font-extrabold text-white truncate drop-shadow">
            {instance.ticketName}
          </h3>
          <p className="text-[11px] text-slate-200/80 mt-0.5 line-clamp-2">{definition?.description}</p>
        </div>
      </div>

      {/* Clear Game Rule Bar */}
      <div className="relative z-10 mb-3 rounded-xl bg-black/35 border border-amber-400/35 px-3 py-2 text-[11px] leading-snug text-amber-100/95 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>{mechanicMeta.rule}</span>
      </div>

      {/* Scratch Foil Box over Bespoke Board */}
      <div className="relative z-10 rounded-2xl overflow-hidden border-2 border-amber-400/50 vc-inset-well min-h-[250px] flex items-stretch justify-center select-none shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
        <div className="w-full p-2.5 flex items-center justify-center">
          <ScratchBoardSurface board={board} isRevealed={isRevealed} accent={accent} />
        </div>

        {/* Interactive Scratch Canvas Overlay */}
        {!isRevealed && (
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-20"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              isDrawingRef.current = true;
              lastPointRef.current = null;
              eraseAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isDrawingRef.current) return;
              eraseAt(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              isDrawingRef.current = false;
              lastPointRef.current = null;
              const pct = measureScratchedRatio();
              setScratchPercent(pct);
              if (pct >= 58) triggerReveal();
            }}
            onPointerCancel={() => {
              isDrawingRef.current = false;
              lastPointRef.current = null;
            }}
          />
        )}
      </div>

      {/* Official Result Banner once Revealed */}
      {isRevealed && (
        <div
          className={`relative z-10 mt-3.5 rounded-2xl px-4 py-3 border flex flex-wrap items-center justify-between gap-2 ${
            isWin
              ? 'bg-amber-400/15 border-amber-300/50 text-amber-100 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.4)]'
              : 'bg-black/35 border-white/10 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            {isWin ? (
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            ) : (
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>{getBoardSummaryMessage(board)}</span>
          </div>
          <span
            className={`font-display font-extrabold text-lg tabular-nums ${
              isWin ? 'text-amber-300' : 'text-slate-400'
            }`}
          >
            {isWin ? `+${formatEuro(instance.rewardAmount)}` : '0,00 €'}
          </span>
        </div>
      )}

      {/* Footer progress & instant reveal helper */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[180px]">
          <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-150"
              style={{ width: `${scratchPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono-tabular text-slate-200 w-10 text-right">
            {scratchPercent}%
          </span>
        </div>

        {!isRevealed && (
          <button
            type="button"
            onClick={() => {
              if (!startedRef.current) {
                startedRef.current = true;
                onStartScratch(instance.instanceId);
              }
              triggerReveal();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl vc-btn-gold font-bold text-xs cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            <span>Tout révéler</span>
          </button>
        )}
      </div>
    </div>
  );
};

function getBoardSummaryMessage(board: ScratchBoardData): string {
  if (!board.isWin) {
    switch (board.mechanic) {
      case 'vault_duo':
        return 'Aucun doublon dans les coffres — Retentez au prochain renouvellement.';
      case 'fetiche_numbers':
        return 'Aucun numéro fétiche retrouvé sur ce ticket.';
      case 'celestial_signs':
        return 'Moins de 2 Signes Maîtres alignés — Gain astral non débloqué.';
      case 'duel_match':
        return 'L’adversaire a remporté les 3 manches sur ce ticket.';
      case 'trio_symbols':
        return 'Aucun alignement de 3 symboles identiques dans la grille.';
      case 'treasure_cascade':
        return `Le symbole ${board.targetSymbol.label} n’apparaît pas dans les 4 reliques.`;
    }
  }

  switch (board.mechanic) {
    case 'vault_duo':
      return `Paire gagnante découverte dans les coffres (${formatEuro(board.rewardCents / 100)}) !`;
    case 'fetiche_numbers': {
      const hit = board.cells.find((c) => c.isMatch);
      return `Numéro Fétiche ${hit?.num ?? ''} trouvé — Gain crédité !`;
    }
    case 'celestial_signs':
      return `2 × ${board.masterSign.label} alignés — Gain astral débloqué !`;
    case 'duel_match': {
      const won = board.duels.find((d) => d.isWin);
      return `${won?.roundLabel ?? 'Duel'} remporté (${won?.playerScore} à ${won?.opponentScore}) !`;
    }
    case 'trio_symbols':
      return 'Alignement de 3 symboles identiques validé — Trésor crédité !';
    case 'treasure_cascade': {
      const hit = board.relics.find((r) => r.isMatch);
      return `${board.targetSymbol.label} trouvé (${formatEuro((hit?.amountCents ?? 0) / 100)} × ${board.multiplier}) !`;
    }
  }
}

const ScratchBoardSurface: React.FC<{
  board: ScratchBoardData;
  isRevealed: boolean;
  accent: string;
}> = ({ board, isRevealed, accent }) => {
  switch (board.mechanic) {
    case 'vault_duo':
      return (
        <div className="w-full grid grid-cols-3 gap-2">
          {board.vaults.map((v, idx) => {
            const highlight = isRevealed && board.isWin && v.isMatch;
            return (
              <div
                key={idx}
                className={`rounded-2xl p-2 text-center flex flex-col items-center justify-center min-h-[132px] border transition-all ${
                  highlight
                    ? 'bg-gradient-to-b from-amber-400/25 to-amber-600/15 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
                    : 'bg-white/[0.04] border-white/12'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Coffre {idx + 1}
                </span>
                <span
                  className={`font-display text-lg font-extrabold tabular-nums ${
                    highlight ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {formatEuro(v.amountCents / 100)}
                </span>
                {highlight && (
                  <span className="text-[10px] font-semibold text-amber-200 mt-1">
                    Paire !
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );

    case 'fetiche_numbers':
      return (
        <div className="w-full space-y-2.5">
          <div className="rounded-xl bg-white/[0.05] border border-white/10 px-2.5 py-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
              Numéros Fétiches
            </span>
            <div className="flex items-center gap-2">
              {board.feticheNumbers.map((num) => {
                const matched = isRevealed && board.cells.some((c) => c.isMatch && c.num === num);
                return (
                  <div
                    key={num}
                    className={`w-9 h-9 rounded-full font-display font-extrabold text-sm flex items-center justify-center tabular-nums ${
                      matched ? 'vc-ball-gold ring-2 ring-amber-200' : 'vc-ball-sky'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {board.cells.map((cell, idx) => {
              const highlight = isRevealed && cell.isMatch;
              return (
                <div
                  key={idx}
                  className={`rounded-xl py-2 px-1.5 text-center border transition-all ${
                    highlight
                      ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div
                    className={`font-display font-extrabold text-base tabular-nums ${
                      highlight ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {cell.num}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-slate-300 mt-0.5">
                    {formatEuro(cell.amountCents / 100)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'celestial_signs':
      return (
        <div className="w-full space-y-2">
          <div className="rounded-xl bg-white/[0.05] border border-white/12 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
              Signe Maître
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none" style={{ color: accent }}>
                {board.masterSign.glyph}
              </span>
              <span className="text-xs font-bold text-white">{board.masterSign.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {board.orbs.map((orb, idx) => {
              const highlight = isRevealed && orb.isMatch;
              return (
                <div
                  key={idx}
                  className={`rounded-xl py-2 px-2 text-center border flex items-center justify-center gap-2 ${
                    highlight
                      ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <span className="text-xl leading-none text-white">{orb.glyph}</span>
                  <span className="text-[11px] text-slate-200 truncate">{orb.label}</span>
                </div>
              );
            })}
          </div>

          <div
            className={`rounded-xl px-3 py-2 border flex items-center justify-between ${
              isRevealed && board.isWin
                ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                : 'bg-white/[0.05] border-white/12'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-300">Gain Astral</span>
            <span
              className={`font-display text-lg font-extrabold tabular-nums ${
                isRevealed && board.isWin ? 'text-amber-300' : 'text-slate-200'
              }`}
            >
              {formatEuro(board.gainCents / 100)}
            </span>
          </div>
        </div>
      );

    case 'duel_match':
      return (
        <div className="w-full space-y-2">
          {board.duels.map((d, idx) => {
            const highlight = isRevealed && d.isWin;
            return (
              <div
                key={idx}
                className={`rounded-xl px-2.5 py-2.5 border flex items-center justify-between gap-2 text-[11px] ${
                  highlight
                    ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Swords className={`w-3.5 h-3.5 shrink-0 ${highlight ? 'text-amber-300' : 'text-sky-400'}`} />
                  <span className="font-semibold text-white truncate">{d.roundLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-tabular shrink-0">
                  <span className={highlight ? 'text-amber-200 font-bold' : 'text-slate-200'}>
                    {board.playerLabel} <strong>{d.playerScore}</strong>
                  </span>
                  <span className="text-slate-500">-</span>
                  <span className="text-slate-300">
                    <strong>{d.opponentScore}</strong> {board.opponentLabel}
                  </span>
                </div>
                <span
                  className={`font-display font-bold tabular-nums shrink-0 ${
                    highlight ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  {formatEuro(d.amountCents / 100)}
                </span>
              </div>
            );
          })}
        </div>
      );

    case 'trio_symbols': {
      const winSet = new Set(isRevealed && board.winningLine ? board.winningLine : []);
      return (
        <div className="w-full space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {board.grid.map((cell, idx) => {
              const highlight = winSet.has(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-xl py-2 px-1.5 text-center border flex flex-col items-center justify-center ${
                    highlight
                      ? 'bg-amber-400/25 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.4)]'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <span
                    className="text-lg leading-none"
                    style={{ color: highlight ? '#FDE047' : accent }}
                  >
                    {cell.glyph}
                  </span>
                  <span className="text-[10px] text-slate-300 mt-1 truncate max-w-full">
                    {cell.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className={`rounded-xl px-3 py-2 border flex items-center justify-between ${
              isRevealed && board.isWin
                ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                : 'bg-white/[0.05] border-white/12'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-300">Gain Trésor</span>
            <span
              className={`font-display text-lg font-extrabold tabular-nums ${
                isRevealed && board.isWin ? 'text-amber-300' : 'text-slate-200'
              }`}
            >
              {formatEuro(board.gainCents / 100)}
            </span>
          </div>
        </div>
      );
    }

    case 'treasure_cascade':
      return (
        <div className="w-full space-y-2">
          <div className="rounded-xl bg-white/[0.05] border border-white/10 px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Symbole Sacré :</span>
            <span className="font-display font-bold text-amber-300 flex items-center gap-1.5">
              <span className="text-base">{board.targetSymbol.glyph}</span>
              <span>{board.targetSymbol.label}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {board.relics.map((r, idx) => {
              const highlight = isRevealed && r.isMatch;
              return (
                <div
                  key={idx}
                  className={`rounded-xl px-2.5 py-2 border flex items-center justify-between gap-1.5 ${
                    highlight
                      ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0" style={{ color: highlight ? '#FDE047' : accent }}>
                      {r.glyph}
                    </span>
                    <span className="text-[11px] text-slate-200 truncate">{r.label}</span>
                  </div>
                  <span className="font-mono-tabular text-[11px] font-bold text-white shrink-0">
                    {formatEuro(r.amountCents / 100)}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className={`rounded-xl px-3 py-1.5 border flex items-center justify-between ${
              isRevealed && board.isWin
                ? 'bg-amber-400/20 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                : 'bg-white/[0.05] border-white/12'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-sky-300">Multiplicateur Bonus</span>
            <span className="font-display text-lg font-extrabold text-amber-300 tabular-nums">
              ×{board.multiplier}
            </span>
          </div>
        </div>
      );
  }
};
