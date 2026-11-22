import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, History, Info, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { isLotteryCutoffClosed, validateLotterySelection } from '../engine/lottery';
import { formatEuro, secureRandom, shuffleArray } from '../engine/rng';
import { AnimationConfig, LotteryConfig, LotteryDraw, SoundConfig } from '../types/vitrocash';

interface LotteryGameProps {
  config: LotteryConfig;
  currentDraw: LotteryDraw;
  allDraws: Record<string, LotteryDraw>;
  sounds: SoundConfig;
  animations: AnimationConfig;
  now: number;
  onSubmitCombination: (drawKey: string, mainNumbers: number[], complementary: number) => void;
  onReplayNextDraw: (drawnKey: string) => void;
}

function formatCountdown(targetMs: number, now: number): string {
  const diff = Math.max(0, Math.floor((targetMs - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const LotteryGame: React.FC<LotteryGameProps> = ({
  config,
  currentDraw,
  allDraws,
  sounds,
  animations,
  now,
  onSubmitCombination,
  onReplayNextDraw,
}) => {
  const [selectedMain, setSelectedMain] = useState<number[]>([]);
  const [selectedComp, setSelectedComp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showScale, setShowScale] = useState(false);

  const numbersPool = useMemo(
    () => Array.from({ length: config.maxNumber }, (_, i) => i + 1),
    [config.maxNumber],
  );

  const pastDraws = useMemo(() => {
    return Object.values(allDraws)
      .filter((d) => d.status === 'DRAWN' && d.playerNumbers)
      .sort((a, b) => b.drawKey.localeCompare(a.drawKey))
      .slice(0, 5);
  }, [allDraws]);

  const isSubmitted =
    currentDraw.status === 'OPEN' &&
    Array.isArray(currentDraw.playerNumbers) &&
    currentDraw.playerNumbers.length === config.mainPickCount;

  const isDrawn = currentDraw.status === 'DRAWN';
  const cutoffClosed = isLotteryCutoffClosed(currentDraw, config, now);

  const toggleMain = (n: number) => {
    if (isSubmitted || isDrawn || cutoffClosed) return;
    setErrorMsg(null);
    soundEngine.playLotteryPick(sounds);
    if (selectedMain.includes(n)) {
      setSelectedMain((prev) => prev.filter((x) => x !== n));
      return;
    }
    if (selectedMain.length >= config.mainPickCount) {
      setErrorMsg(`Maximum ${config.mainPickCount} numéros principaux.`);
      return;
    }
    if (selectedComp === n) {
      setSelectedComp(null);
    }
    setSelectedMain((prev) => [...prev, n].sort((a, b) => a - b));
  };

  const chooseComp = (n: number) => {
    if (isSubmitted || isDrawn || cutoffClosed) return;
    if (selectedMain.includes(n)) {
      setErrorMsg('Le numéro complémentaire doit être différent des 5 numéros principaux.');
      return;
    }
    setErrorMsg(null);
    soundEngine.playLotteryPick(sounds);
    setSelectedComp((prev) => (prev === n ? null : n));
  };

  const handleQuickFlash = () => {
    if (isSubmitted || isDrawn || cutoffClosed) return;
    const shuffled = shuffleArray(numbersPool, secureRandom);
    setSelectedMain(shuffled.slice(0, config.mainPickCount).sort((a, b) => a - b));
    setSelectedComp(shuffled[config.mainPickCount]);
    setErrorMsg(null);
    soundEngine.playLotteryPick(sounds);
  };

  const handleValidate = () => {
    const check = validateLotterySelection(selectedMain, selectedComp, config);
    if (!check.valid) {
      setErrorMsg(check.error ?? 'Combinaison invalide.');
      return;
    }
    soundEngine.playWin(sounds, false);
    soundEngine.triggerHaptic(animations, 25);
    onSubmitCombination(currentDraw.drawKey, [...selectedMain].sort((a, b) => a - b), selectedComp!);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl vc-card-relief p-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">
            Loterie · {String(config.drawHour).padStart(2, '0')}h
            {String(config.drawMinute).padStart(2, '0')}
          </h2>
          {!isDrawn && (
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-mono-tabular shrink-0">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatCountdown(currentDraw.scheduledAt, now)}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          Tirage du {currentDraw.drawKey} · {config.timezone} · Gratuite (crédits fictifs)
        </p>
      </div>

      {/* DRAWN RESULT STATE */}
      {isDrawn && (
        <div className="rounded-3xl vc-card-hero p-4 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-amber-300">Résultat du tirage</p>
              <h3 className="font-display text-xl font-extrabold text-white mt-0.5">
                Tirage du {currentDraw.drawKey}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Gain final</p>
              <p className="font-display text-2xl font-extrabold text-amber-300 tabular-nums">
                {formatEuro(currentDraw.totalPrize ?? 0)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl vc-inset-well p-3.5 space-y-2.5">
            <p className="text-xs font-medium text-slate-300">Combinaison gagnante</p>
            <div className="flex flex-wrap items-center gap-2">
              {currentDraw.winningNumbers?.map((n) => (
                <span
                  key={n}
                  className="w-9 h-9 rounded-full vc-ball-gold font-mono-tabular font-bold text-xs flex items-center justify-center"
                >
                  {n}
                </span>
              ))}
              <span className="text-slate-500 mx-0.5 font-bold">+</span>
              <span className="w-9 h-9 rounded-full vc-ball-sky font-mono-tabular font-bold text-xs flex items-center justify-center ring-2 ring-sky-300/60">
                {currentDraw.winningComplementary}
              </span>
            </div>
          </div>

          {currentDraw.playerNumbers && (
            <div className="rounded-2xl bg-black/25 border border-amber-400/35 p-3.5 space-y-3">
              <p className="text-xs font-medium text-slate-300">Votre combinaison enregistrée</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {currentDraw.playerNumbers.map((n) => {
                  const matched = currentDraw.matchedMain?.includes(n);
                  return (
                    <span
                      key={n}
                      className={`w-9 h-9 rounded-full font-mono-tabular font-bold text-xs flex items-center justify-center border ${
                        matched
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-white/5 border-white/15 text-slate-300'
                      }`}
                    >
                      {n}
                    </span>
                  );
                })}
                <span className="text-slate-500 mx-0.5">+</span>
                <span
                  className={`w-9 h-9 rounded-full font-mono-tabular font-bold text-xs flex items-center justify-center border ${
                    currentDraw.matchedComplementary
                      ? 'bg-sky-500/30 border-sky-400 text-sky-200'
                      : 'bg-white/5 border-white/15 text-slate-300'
                  }`}
                >
                  {currentDraw.playerComplementary}
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 grid grid-cols-1 gap-2 text-xs tabular-nums">
                <div className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-400">Numéros principaux ({currentDraw.matchedMain?.length ?? 0})</span>
                  <span className="font-bold text-white">{formatEuro(currentDraw.mainPrize ?? 0)}</span>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-400">
                    Bonus complémentaire ({currentDraw.matchedComplementary ? 'Trouvé' : 'Non trouvé'})
                  </span>
                  <span className="font-bold text-sky-300">{formatEuro(currentDraw.bonusPrize ?? 0)}</span>
                </div>
                <div className="rounded-xl bg-amber-500/15 px-3 py-2 flex items-center justify-between">
                  <span className="text-amber-200/80">Calcul final</span>
                  <span className="font-bold text-amber-300">
                    {formatEuro(currentDraw.mainPrize ?? 0)} + {formatEuro(currentDraw.bonusPrize ?? 0)} ={' '}
                    {formatEuro(currentDraw.totalPrize ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(sounds);
              setSelectedMain([]);
              setSelectedComp(null);
              onReplayNextDraw(currentDraw.drawKey);
            }}
            className="w-full min-h-[50px] rounded-2xl vc-btn-gold font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>REJOUER</span>
          </button>
        </div>
      )}

      {/* SUBMITTED LOCKED TICKET STATE */}
      {isSubmitted && !isDrawn && (
        <div className="rounded-3xl vc-card-relief border-amber-300/65 p-4 space-y-3.5">
          <div className="flex items-center gap-2.5 text-sky-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h3 className="font-display text-base font-bold text-white">
              Grille validée pour {String(config.drawHour).padStart(2, '0')}h
              {String(config.drawMinute).padStart(2, '0')}
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Votre grille est verrouillée pour ce tirage. Si l&apos;application est fermée au moment du
            tirage, le résultat sera calculé automatiquement à la prochaine ouverture.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {currentDraw.playerNumbers?.map((n) => (
              <span
                key={n}
                className="w-9 h-9 rounded-full vc-ball-gold font-mono-tabular font-bold text-xs flex items-center justify-center"
              >
                {n}
              </span>
            ))}
            <span className="text-slate-400 font-bold">+</span>
            <span className="w-9 h-9 rounded-full vc-ball-sky font-mono-tabular font-bold text-xs flex items-center justify-center">
              {currentDraw.playerComplementary}
            </span>
          </div>
        </div>
      )}

      {/* ACTIVE PICKER STATE */}
      {!isSubmitted && !isDrawn && (
        <div className="rounded-3xl vc-card-relief p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-white">
                {config.mainPickCount} numéros + 1 complémentaire
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                Sélection : {selectedMain.length}/{config.mainPickCount} ·{' '}
                {selectedComp !== null ? `Compl. ${selectedComp}` : 'Compl. aucun'}
              </p>
            </div>
            <button
              type="button"
              disabled={cutoffClosed}
              onClick={handleQuickFlash}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-sky-300 cursor-pointer shrink-0"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Flash</span>
            </button>
          </div>

          {cutoffClosed && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 py-2.5 text-xs text-amber-200">
              Les validations sont clôturées quelques instants avant le tirage.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">
              1. Numéros principaux ({config.mainPickCount} parmi 1 à {config.maxNumber})
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {numbersPool.map((n) => {
                const isMain = selectedMain.includes(n);
                const isComp = selectedComp === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={cutoffClosed}
                    onClick={() => toggleMain(n)}
                    className={`min-h-[40px] rounded-xl font-mono-tabular font-bold text-[13px] transition-all cursor-pointer border ${
                      isMain
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                        : isComp
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 opacity-60'
                          : 'bg-black/30 text-slate-200 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-sky-300 mb-2">
              2. Complémentaire (Bonus +{formatEuro(config.complementaryBonus)})
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {numbersPool.map((n) => {
                const isMain = selectedMain.includes(n);
                const isComp = selectedComp === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={cutoffClosed || isMain}
                    onClick={() => chooseComp(n)}
                    className={`min-h-[40px] rounded-xl font-mono-tabular font-bold text-[13px] transition-all border ${
                      isComp
                        ? 'bg-sky-500 text-white border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.45)] cursor-pointer'
                        : isMain
                          ? 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                          : 'bg-black/30 text-slate-300 border-white/10 hover:border-sky-400/50 cursor-pointer'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-3 py-2 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={cutoffClosed}
            onClick={handleValidate}
            className="w-full min-h-[50px] rounded-2xl vc-btn-electric font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            <span>Valider ma combinaison</span>
          </button>
        </div>
      )}

      {/* Recent Past Draws */}
      {pastDraws.length > 0 && (
        <div className="rounded-2xl vc-card-relief p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <History className="w-4 h-4 text-amber-400" />
            <span>Derniers tirages terminés</span>
          </div>
          <div className="space-y-2">
            {pastDraws.map((d) => (
              <div
                key={d.drawKey}
                className="rounded-xl bg-black/30 px-3 py-2 flex items-center justify-between gap-2 text-xs tabular-nums"
              >
                <div className="min-w-0 truncate">
                  <span className="font-semibold text-white">{d.drawKey}</span>
                  <span className="text-slate-400 ml-2">
                    {d.winningNumbers?.join('-')} + {d.winningComplementary}
                  </span>
                </div>
                <span className="font-mono-tabular font-bold text-amber-300 shrink-0">
                  +{formatEuro(d.totalPrize ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl vc-card-relief overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScale((v) => !v)}
          className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
        >
          <span className="inline-flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Barème officiel de la loterie</span>
          </span>
          <span className="text-[11px] text-slate-400">{showScale ? 'Masquer' : 'Afficher'}</span>
        </button>
        {showScale && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs tabular-nums">
            {Object.entries(config.prizeScale).map(([count, prize]) => (
              <div key={count} className="rounded-xl bg-black/30 px-3 py-2 flex justify-between">
                <span className="text-slate-300">{count} num.</span>
                <span className="font-bold text-amber-300">{formatEuro(prize)}</span>
              </div>
            ))}
            <div className="rounded-xl bg-sky-500/15 px-3 py-2 flex justify-between col-span-2">
              <span className="text-sky-200">Complémentaire (bonus)</span>
              <span className="font-bold text-sky-300">+{formatEuro(config.complementaryBonus)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
