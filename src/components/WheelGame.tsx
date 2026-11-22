import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Info, RotateCw, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { formatEuro, rollWeighted } from '../engine/rng';
import {
  ActivityQuotaState,
  AnimationConfig,
  SoundConfig,
  WheelConfig,
  WheelSegment,
} from '../types/vitrocash';

interface WheelGameProps {
  config: WheelConfig;
  quota: ActivityQuotaState;
  sounds: SoundConfig;
  animations: AnimationConfig;
  now: number;
  onWheelResult: (segment: WheelSegment) => void;
}

function formatCountdown(targetMs: number | null, now: number): string {
  if (!targetMs) return 'Après utilisation des tours';
  const diff = Math.max(0, Math.floor((targetMs - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Smooth acceleration (0..0.18) -> peak speed -> realistic quartic deceleration (0.18..1).
 */
function wheelAccelDecelEase(t: number): number {
  const split = 0.18;
  // Match C1 continuity at split
  // Curve 1 (t in [0, split]): a * t^2 => derivative = 2 * a * t
  // Curve 2 (t in [split, 1]): 1 - b * (1 - t)^4 => derivative = 4 * b * (1 - t)^3
  // Continuous value & slope at split:
  // a * s^2 + b * (1-s)^4 = 1
  // 2 * a * s = 4 * b * (1-s)^3  => a = 2 * b * (1-s)^3 / s
  const oneMinusS = 1 - split;
  const b = 1 / (2 * split * Math.pow(oneMinusS, 3) + Math.pow(oneMinusS, 4));
  const a = (2 * b * Math.pow(oneMinusS, 3)) / split;
  if (t <= split) {
    return a * t * t;
  }
  return 1 - b * Math.pow(1 - t, 4);
}

export const WheelGame: React.FC<WheelGameProps> = ({
  config,
  quota,
  sounds,
  animations,
  now,
  onWheelResult,
}) => {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<WheelSegment | null>(null);
  const [showProbs, setShowProbs] = useState(false);
  const [ledPhase, setLedPhase] = useState(0);

  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const segments = useMemo(
    () => (config.segments.length > 0 ? config.segments : []),
    [config.segments],
  );

  useEffect(() => {
    if (!animations.lightsEnabled) return;
    const id = setInterval(() => {
      setLedPhase((p) => (p + 1) % 2);
    }, isSpinning ? 140 : 650);
    return () => clearInterval(id);
  }, [animations.lightsEnabled, isSpinning]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSpin = () => {
    if (isSpinning || quota.remaining <= 0 || segments.length === 0) return;

    const chosen = rollWeighted(segments);
    const segIdx = segments.findIndex((s) => s.id === chosen.id);
    const sliceDeg = 360 / segments.length;

    const jitter = (Math.random() - 0.5) * sliceDeg * 0.52;
    const targetMod = (360 - segIdx * sliceDeg + jitter + 360) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const deltaToTarget = (targetMod - currentMod + 360) % 360;
    const extraTurns = (animations.masterEnabled ? 6 : 1) * 360;
    const startRot = rotationRef.current;
    const totalDelta = extraTurns + deltaToTarget;
    const duration = animations.masterEnabled ? Math.max(1200, animations.wheelSpinDurationMs) : 320;

    setIsSpinning(true);
    setLastResult(null);
    soundEngine.playTap(sounds);

    // Save and credit atomically BEFORE animation
    onWheelResult(chosen);

    const startTime = performance.now();
    let lastPegIndex = Math.floor(startRot / sliceDeg);

    const animate = (frameNow: number) => {
      const t = Math.min(1, (frameNow - startTime) / duration);
      const eased = wheelAccelDecelEase(t);
      const curRot = startRot + totalDelta * eased;
      rotationRef.current = curRot;
      setRotationDeg(curRot);

      const currentPegIndex = Math.floor(curRot / sliceDeg);
      if (currentPegIndex !== lastPegIndex) {
        lastPegIndex = currentPegIndex;
        soundEngine.playWheelPeg(sounds);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setLastResult(chosen);
        if (chosen.amount > 0) {
          soundEngine.playWin(sounds, chosen.amount >= 0.2);
          soundEngine.triggerHaptic(animations, [30, 40, 70]);
        } else {
          soundEngine.playZero(sounds, 'wheel');
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const n = Math.max(1, segments.length);
  const sliceAngle = 360 / n;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl vc-card-relief p-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">Grande Roue VITROCASH</h2>
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

      {/* Wheel Arena */}
      <div className="rounded-3xl vc-card-hero p-4 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
        {/* Top Pointer Flapper */}
        <div className="relative z-20 -mb-3">
          <div className="w-0 h-0 border-l-[13px] border-r-[13px] border-t-[24px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_14px_rgba(251,191,36,0.85)]" />
        </div>

        {/* Outer Bezel with SVG-aligned LEDs */}
        <div className="relative w-68 h-68 flex items-center justify-center">
          <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <circle cx="120" cy="120" r="113" fill="none" stroke="#F59E0B" strokeOpacity="0.35" strokeWidth="6" />
            {animations.lightsEnabled &&
              Array.from({ length: 16 }).map((_, idx) => {
                const rad = ((idx * 360) / 16) * (Math.PI / 180);
                const cx = 120 + 113 * Math.cos(rad);
                const cy = 120 + 113 * Math.sin(rad);
                const isLit = idx % 2 === ledPhase;
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={isLit ? 3.2 : 2.4}
                    fill={isLit ? '#FDE047' : '#38BDF8'}
                    opacity={isLit ? 1 : 0.4}
                  />
                );
              })}
          </svg>

          <div
            className="w-[86%] h-[86%] rounded-full border-[5px] border-amber-400/90 shadow-[0_0_55px_rgba(59,130,246,0.35),inset_0_0_24px_rgba(0,0,0,0.65)] overflow-hidden will-change-transform relative"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {segments.map((seg, i) => {
                const startDeg = -90 + (i - 0.5) * sliceAngle;
                const endDeg = startDeg + sliceAngle;
                const startRad = (startDeg * Math.PI) / 180;
                const endRad = (endDeg * Math.PI) / 180;
                const x1 = 100 + 100 * Math.cos(startRad);
                const y1 = 100 + 100 * Math.sin(startRad);
                const x2 = 100 + 100 * Math.cos(endRad);
                const y2 = 100 + 100 * Math.sin(endRad);
                const largeArc = sliceAngle > 180 ? 1 : 0;
                const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const textRot = i * sliceAngle;

                return (
                  <g key={seg.id}>
                    <path d={pathData} fill={seg.color} stroke="#0B0618" strokeWidth="1.2" />
                    <g transform={`rotate(${textRot} 100 100)`}>
                      <text
                        x="100"
                        y="26"
                        textAnchor="middle"
                        fill={seg.textColor}
                        fontSize="10.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {seg.label}
                      </text>
                    </g>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="22" fill="#0B0618" stroke="#FBBF24" strokeWidth="3" />
              <text
                x="100"
                y="104"
                textAnchor="middle"
                fill="#FDE68A"
                fontSize="10"
                fontWeight="800"
                fontFamily="Outfit, sans-serif"
              >
                VC
              </text>
            </svg>
          </div>
          {/* Non-rotating top-left specular glass reflection over wheel */}
          <div
            className="absolute w-[86%] h-[86%] rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 36%, transparent 55%)',
            }}
          />
        </div>

        {lastResult && !isSpinning && (
          <div
            className={`relative z-10 mt-4 px-4 py-2.5 rounded-2xl border text-center ${
              lastResult.amount > 0
                ? 'bg-amber-500/20 border-amber-300/60 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_rgba(245,158,11,0.28)]'
                : 'vc-inset-well text-slate-300'
            }`}
          >
            <div className="inline-flex items-center gap-2 font-display font-bold text-base tabular-nums">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lastResult.amount > 0
                  ? `Bravo ! +${formatEuro(lastResult.amount)} en crédits fictifs`
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
              : 'vc-btn-gold'
          }`}
        >
          <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>
            {isSpinning
              ? 'La roue tourne...'
              : quota.remaining > 0
                ? `Lancer la roue (${quota.remaining} restant${quota.remaining > 1 ? 's' : ''})`
                : 'Tours épuisés · En attente'}
          </span>
        </button>
      </div>

      <div className="rounded-2xl vc-card-relief overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProbs((v) => !v)}
          className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
        >
          <span className="inline-flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Segments et probabilités de la roue</span>
          </span>
          <span className="text-[11px] text-slate-400">{showProbs ? 'Masquer' : 'Afficher'}</span>
        </button>
        {showProbs && (
          <div className="px-3.5 pb-3.5 pt-2 grid grid-cols-2 gap-2 border-t border-white/10">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="rounded-xl bg-black/30 px-3 py-2 flex items-center justify-between text-xs tabular-nums"
              >
                <span className="font-semibold text-amber-300">{seg.label}</span>
                <span className="text-slate-300">{seg.probability.toString().replace('.', ',')} %</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
