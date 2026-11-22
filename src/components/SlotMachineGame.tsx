import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Info, Play, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { formatEuro, rollWeighted, secureRandom } from '../engine/rng';
import {
  ActivityQuotaState,
  AnimationConfig,
  SlotConfig,
  SlotOutcomeTier,
  SlotSymbol,
  SoundConfig,
} from '../types/vitrocash';

interface SlotMachineGameProps {
  config: SlotConfig;
  quota: ActivityQuotaState;
  sounds: SoundConfig;
  animations: AnimationConfig;
  now: number;
  onSlotResult: (outcome: SlotOutcomeTier, symbols: [SlotSymbol, SlotSymbol, SlotSymbol]) => void;
}

function formatCountdown(targetMs: number | null, now: number): string {
  if (!targetMs) return 'Après utilisation des tours';
  const diff = Math.max(0, Math.floor((targetMs - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const SlotMachineGame: React.FC<SlotMachineGameProps> = ({
  config,
  quota,
  sounds,
  animations,
  now,
  onSlotResult,
}) => {
  const symbols = useMemo(
    () => (config.symbols.length >= 2 ? config.symbols : []),
    [config.symbols],
  );

  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol]>(() => [
    symbols[0] ?? { id: 'a', name: '7', glyph: '7', color: '#FBBF24' },
    symbols[1] ?? { id: 'b', name: 'Diamant', glyph: '◆', color: '#38BDF8' },
    symbols[2] ?? symbols[0] ?? { id: 'c', name: 'Couronne', glyph: '♛', color: '#F59E0B' },
  ]);
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [reelBounce, setReelBounce] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<SlotOutcomeTier | null>(null);
  const [showRules, setShowRules] = useState(false);

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const pickNonMatchingTriple = (): [SlotSymbol, SlotSymbol, SlotSymbol] => {
    const idx1 = Math.floor(secureRandom() * symbols.length);
    const idx2 = Math.floor(secureRandom() * symbols.length);
    let idx3 = Math.floor(secureRandom() * symbols.length);
    if (idx1 === idx2 && idx2 === idx3) {
      idx3 = (idx3 + 1) % symbols.length;
    }
    return [symbols[idx1], symbols[idx2], symbols[idx3]];
  };

  const handleSpin = () => {
    if (isSpinning || quota.remaining <= 0 || symbols.length < 2 || config.outcomes.length === 0) return;

    const outcome = rollWeighted(config.outcomes);
    const isWin = outcome.amount > 0;
    const finalTriple: [SlotSymbol, SlotSymbol, SlotSymbol] = isWin
      ? (() => {
          const picked = symbols[Math.floor(secureRandom() * Math.min(2, symbols.length))] ?? symbols[0];
          return [picked, picked, picked];
        })()
      : pickNonMatchingTriple();

    setIsSpinning(true);
    setLastOutcome(null);
    setReelSpinning([true, true, true]);
    setReelBounce([false, false, false]);
    soundEngine.playTap(sounds);

    // Save and credit atomically BEFORE animation
    onSlotResult(outcome, finalTriple);

    const baseDuration = animations.masterEnabled ? Math.max(900, animations.slotSpinDurationMs) : 300;
    const stopTimes = [
      Math.round(baseDuration * 0.55),
      Math.round(baseDuration * 0.78),
      baseDuration,
    ];

    const spinState = { r0: true, r1: true, r2: true };

    const tickId = window.setInterval(() => {
      setReels((prev) => [
        spinState.r0 ? symbols[Math.floor(Math.random() * symbols.length)] ?? prev[0] : prev[0],
        spinState.r1 ? symbols[Math.floor(Math.random() * symbols.length)] ?? prev[1] : prev[1],
        spinState.r2 ? symbols[Math.floor(Math.random() * symbols.length)] ?? prev[2] : prev[2],
      ]);
      soundEngine.playSlotTick(sounds);
    }, 75);

    timersRef.current.push(tickId);

    stopTimes.forEach((ms, reelIdx) => {
      const tid = window.setTimeout(() => {
        if (reelIdx === 0) spinState.r0 = false;
        if (reelIdx === 1) spinState.r1 = false;
        if (reelIdx === 2) spinState.r2 = false;

        setReelSpinning((prev) => {
          const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
          next[reelIdx] = false;
          return next;
        });
        setReels((prev) => {
          const next: [SlotSymbol, SlotSymbol, SlotSymbol] = [...prev] as [SlotSymbol, SlotSymbol, SlotSymbol];
          next[reelIdx] = finalTriple[reelIdx];
          return next;
        });
        setReelBounce((prev) => {
          const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
          next[reelIdx] = true;
          return next;
        });
        soundEngine.playSlotReelStop(sounds, reelIdx);

        if (reelIdx === 2) {
          clearInterval(tickId);
          setIsSpinning(false);
          setLastOutcome(outcome);
          if (isWin) {
            soundEngine.playWin(sounds, true);
            soundEngine.triggerHaptic(animations, [35, 50, 80]);
          } else {
            soundEngine.playZero(sounds, 'slots');
          }
        }
      }, ms);
      timersRef.current.push(tid);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl vc-card-relief p-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">Bandit Manchot</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-mono-tabular shrink-0">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{formatCountdown(quota.nextRenewalAt, now)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          {quota.remaining} / {quota.maxAttempts} tours disponibles · {config.maxSpins} tours toutes les{' '}
          {config.intervalHours} h
        </p>
      </div>

      {/* 3D Luxury Cabinet */}
      <div className="rounded-3xl vc-card-hero p-4 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
        <div className="relative z-10 text-[11px] font-display font-bold tracking-[0.18em] uppercase text-amber-300 mb-3.5 drop-shadow text-center">
          Alignez 3 symboles identiques
        </div>

        <div className="relative z-10 w-full rounded-2xl vc-inset-well border-2 border-amber-400/50 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.75)]">
          {/* Glowing Center Payline Laser */}
          <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-amber-400/10 via-amber-300/60 to-amber-400/10 pointer-events-none z-20" />
          <div className="grid grid-cols-3 gap-2.5 relative z-10">
            {reels.map((sym, idx) => {
              const spinning = reelSpinning[idx];
              const bounced = reelBounce[idx];
              const isWinHighlight = !isSpinning && lastOutcome && lastOutcome.amount > 0;
              return (
                <div
                  key={idx}
                  className={`h-26 rounded-xl flex flex-col items-center justify-center border transition-all duration-150 overflow-hidden relative ${
                    isWinHighlight
                      ? 'bg-gradient-to-b from-amber-900/50 via-amber-500/20 to-amber-900/50 border-amber-300 shadow-[0_0_26px_rgba(251,191,36,0.45),inset_0_8px_14px_rgba(0,0,0,0.6)]'
                      : 'vc-reel-drum border-white/15'
                  }`}
                >
                  {/* Specular glass reflection strip across each reel drum */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(125deg, rgba(255,255,255,0.12) 0%, transparent 42%)',
                    }}
                  />
                  <div
                    className={`relative z-10 text-4xl font-display font-extrabold select-none transition-transform duration-150 drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)] ${
                      spinning
                        ? 'scale-90 translate-y-1 opacity-75 blur-[0.6px]'
                        : bounced
                          ? 'scale-105 translate-y-0 opacity-100'
                          : 'scale-100 opacity-100'
                    }`}
                    style={{ color: sym.color }}
                  >
                    {sym.glyph}
                  </div>
                  <span className="relative z-10 mt-1 text-[11px] font-medium text-slate-300 truncate max-w-full px-1">
                    {sym.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {lastOutcome && !isSpinning && (
          <div
            className={`relative z-10 mt-4 px-4 py-2.5 rounded-2xl border text-center ${
              lastOutcome.amount > 0
                ? 'bg-amber-500/20 border-amber-300/60 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_rgba(245,158,11,0.28)]'
                : 'vc-inset-well text-slate-300'
            }`}
          >
            <div className="inline-flex items-center gap-2 font-display font-bold text-base tabular-nums">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lastOutcome.amount > 0
                  ? `Alignement gagnant ! +${formatEuro(lastOutcome.amount)}`
                  : `Résultat : ${formatEuro(0)}`}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isSpinning || quota.remaining <= 0}
          onClick={handleSpin}
          className={`relative z-10 mt-4 w-full min-h-[50px] rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer ${
            isSpinning || quota.remaining <= 0
              ? 'bg-slate-800/80 border border-white/10 text-slate-500 cursor-not-allowed'
              : 'vc-btn-electric'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>
            {isSpinning
              ? 'Rouleaux en cours...'
              : quota.remaining > 0
                ? `Lancer (${quota.remaining} restant${quota.remaining > 1 ? 's' : ''})`
                : 'Tours épuisés · En attente'}
          </span>
        </button>
      </div>

      <div className="rounded-2xl vc-card-relief overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
        >
          <span className="inline-flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Règles et probabilités</span>
          </span>
          <span className="text-[11px] text-slate-400">{showRules ? 'Masquer' : 'Afficher'}</span>
        </button>
        {showRules && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
            {config.outcomes.map((o) => (
              <div
                key={o.id}
                className="rounded-xl bg-black/30 px-3 py-2 text-xs tabular-nums flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-amber-300">{formatEuro(o.amount)}</span>
                <span className="text-slate-300">{o.probability.toString().replace('.', ',')} %</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
