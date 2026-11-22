import React, { useState } from 'react';
import { Check, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { formatEuro, generateUid } from '../../engine/rng';
import { formatDurationHms, getNextStopwatchThreshold } from '../../engine/stopwatch';
import {
  ActivityKey,
  AppConfig,
  AppState,
  RenewalMode,
  SlotOutcomeTier,
  SlotSymbol,
  WheelSegment,
} from '../../types/vitrocash';

interface AdminGamesSectionsProps {
  section: 'wheel' | 'slots' | 'lottery' | 'stopwatch' | 'milestones';
  state: AppState;
  onUpdateConfig: (section: keyof AppConfig, value: unknown, auditSummary: string) => void;
  onValidateMilestone: (milestoneId: string, note?: string) => void;
  onRejectMilestone: (milestoneId: string, note?: string) => void;
  onForceLotteryDrawNow: () => void;
  manualStopwatchPaused: boolean;
  onToggleStopwatchPause: () => void;
}

export const AdminGamesSections: React.FC<AdminGamesSectionsProps> = ({
  section,
  state,
  onUpdateConfig,
  onValidateMilestone,
  onRejectMilestone,
  onForceLotteryDrawNow,
  manualStopwatchPaused,
  onToggleStopwatchPause,
}) => {
  const [milestoneNote, setMilestoneNote] = useState('');

  if (section === 'wheel') {
    const cfg = state.config.wheel;
    const sum = Math.round(cfg.segments.reduce((s, seg) => s + seg.probability, 0) * 100) / 100;

    const updateSeg = (idx: number, patch: Partial<WheelSegment>) => {
      const next = cfg.segments.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      onUpdateConfig('wheel', { ...cfg, segments: next }, 'Modification segment de la roue');
    };

    return (
      <div className="space-y-5">
        <h2 className="font-display text-xl font-bold text-white">7. Paramètres de la Roue</h2>

        <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Tours par série</span>
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.maxSpins}
              onChange={(e) =>
                onUpdateConfig(
                  'wheel',
                  { ...cfg, maxSpins: Math.max(1, Number(e.target.value)) },
                  'Modification nombre de tours roue',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Intervalle (heures)</span>
            <input
              type="number"
              min={1}
              max={72}
              value={cfg.intervalHours}
              onChange={(e) =>
                onUpdateConfig(
                  'wheel',
                  { ...cfg, intervalHours: Math.max(1, Number(e.target.value)) },
                  'Modification intervalle roue',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Mode de renouvellement</span>
            <select
              value={cfg.renewalMode}
              onChange={(e) =>
                onUpdateConfig(
                  'wheel',
                  { ...cfg, renewalMode: e.target.value as RenewalMode },
                  'Modification mode renouvellement roue',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              <option value="FIXED_INTERVAL">Intervalles fixes (indépendant)</option>
              <option value="AFTER_CONSUMPTION">Après consommation de la série</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white">Segments, couleurs et probabilités</span>
            <div className="flex items-center gap-3">
              {Math.abs(sum - 100) > 0.05 && sum > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const normalized = cfg.segments.map((s) => ({
                      ...s,
                      probability: Math.round((s.probability / sum) * 1000) / 10,
                    }));
                    onUpdateConfig('wheel', { ...cfg, segments: normalized }, 'Normalisation probabilités roue');
                  }}
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Normaliser à 100 %
                </button>
              )}
              <span
                className={`font-mono-tabular font-bold ${
                  Math.abs(sum - 100) <= 0.05 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                Total : {sum} %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {cfg.segments.map((seg, idx) => (
              <div key={seg.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                <input
                  type="text"
                  value={seg.label}
                  onChange={(e) => updateSeg(idx, { label: e.target.value })}
                  className="col-span-3 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2 text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={seg.amount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateSeg(idx, { amount: v, label: formatEuro(v) });
                  }}
                  className="col-span-3 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2 font-mono-tabular text-amber-300"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={seg.probability}
                  onChange={(e) => updateSeg(idx, { probability: Number(e.target.value) })}
                  className="col-span-3 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2 font-mono-tabular text-sky-300"
                />
                <input
                  type="color"
                  value={seg.color}
                  onChange={(e) => updateSeg(idx, { color: e.target.value })}
                  className="col-span-2 h-9 w-full rounded-lg bg-black/40 border border-white/15"
                />
                <button
                  type="button"
                  disabled={cfg.segments.length <= 2}
                  onClick={() =>
                    onUpdateConfig(
                      'wheel',
                      { ...cfg, segments: cfg.segments.filter((_, i) => i !== idx) },
                      'Suppression segment roue',
                    )
                  }
                  className="col-span-1 min-h-[38px] rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig(
                'wheel',
                {
                  ...cfg,
                  segments: [
                    ...cfg.segments,
                    {
                      id: generateUid('w'),
                      label: '0,00 €',
                      amount: 0,
                      probability: 0,
                      color: '#312E81',
                      textColor: '#FFFFFF',
                    },
                  ],
                },
                'Ajout segment roue',
              )
            }
            className="inline-flex items-center gap-1.5 text-xs text-sky-300 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un segment</span>
          </button>
        </div>
      </div>
    );
  }

  if (section === 'slots') {
    const cfg = state.config.slots;
    const sum = Math.round(cfg.outcomes.reduce((s, o) => s + o.probability, 0) * 100) / 100;

    const updateOutcome = (idx: number, patch: Partial<SlotOutcomeTier>) => {
      const next = cfg.outcomes.map((o, i) => (i === idx ? { ...o, ...patch } : o));
      onUpdateConfig('slots', { ...cfg, outcomes: next }, 'Modification gain bandit manchot');
    };

    const updateSymbol = (idx: number, patch: Partial<SlotSymbol>) => {
      const next = cfg.symbols.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      onUpdateConfig('slots', { ...cfg, symbols: next }, 'Modification symbole bandit manchot');
    };

    return (
      <div className="space-y-5">
        <h2 className="font-display text-xl font-bold text-white">8. Paramètres du Bandit Manchot</h2>

        <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Tours par série</span>
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.maxSpins}
              onChange={(e) =>
                onUpdateConfig(
                  'slots',
                  { ...cfg, maxSpins: Math.max(1, Number(e.target.value)) },
                  'Modification tours bandit manchot',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Intervalle (heures)</span>
            <input
              type="number"
              min={1}
              max={72}
              value={cfg.intervalHours}
              onChange={(e) =>
                onUpdateConfig(
                  'slots',
                  { ...cfg, intervalHours: Math.max(1, Number(e.target.value)) },
                  'Modification intervalle bandit manchot',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Mode de renouvellement</span>
            <select
              value={cfg.renewalMode}
              onChange={(e) =>
                onUpdateConfig(
                  'slots',
                  { ...cfg, renewalMode: e.target.value as RenewalMode },
                  'Modification renouvellement bandit manchot',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              <option value="FIXED_INTERVAL">Intervalles fixes (indépendant)</option>
              <option value="AFTER_CONSUMPTION">Après consommation de la série</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white">Récompenses & probabilités</span>
            <div className="flex items-center gap-3">
              {Math.abs(sum - 100) > 0.05 && sum > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const normalized = cfg.outcomes.map((o) => ({
                      ...o,
                      probability: Math.round((o.probability / sum) * 1000) / 10,
                    }));
                    onUpdateConfig('slots', { ...cfg, outcomes: normalized }, 'Normalisation probabilités bandit manchot');
                  }}
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Normaliser à 100 %
                </button>
              )}
              <span
                className={`font-mono-tabular font-bold ${
                  Math.abs(sum - 100) <= 0.05 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                Total : {sum} %
              </span>
            </div>
          </div>
          {cfg.outcomes.map((o, idx) => (
            <div key={o.id} className="grid grid-cols-12 gap-2 items-center text-xs">
              <input
                type="number"
                step="0.01"
                min="0"
                value={o.amount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateOutcome(idx, { amount: v, label: formatEuro(v) });
                }}
                className="col-span-5 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 font-mono-tabular text-amber-300"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={o.probability}
                onChange={(e) => updateOutcome(idx, { probability: Number(e.target.value) })}
                className="col-span-5 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 font-mono-tabular text-sky-300"
              />
              <button
                type="button"
                disabled={cfg.outcomes.length <= 2}
                onClick={() =>
                  onUpdateConfig(
                    'slots',
                    { ...cfg, outcomes: cfg.outcomes.filter((_, i) => i !== idx) },
                    'Suppression palier bandit manchot',
                  )
                }
                className="col-span-2 min-h-[38px] rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onUpdateConfig(
                'slots',
                {
                  ...cfg,
                  outcomes: [
                    ...cfg.outcomes,
                    { id: generateUid('sl'), amount: 0, probability: 0, label: '0,00 €' },
                  ],
                },
                'Ajout palier bandit manchot',
              )
            }
            className="text-xs text-sky-300 hover:underline cursor-pointer"
          >
            + Ajouter un résultat
          </button>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Symboles des rouleaux ({cfg.symbols.length})</span>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig(
                  'slots',
                  {
                    ...cfg,
                    symbols: [
                      ...cfg.symbols,
                      { id: generateUid('sym'), name: 'Symbole', glyph: '✦', color: '#FBBF24' },
                    ],
                  },
                  'Ajout symbole bandit manchot',
                )
              }
              className="text-sky-300 hover:underline cursor-pointer"
            >
              + Ajouter un symbole
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cfg.symbols.map((sym, idx) => (
              <div key={sym.id} className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  maxLength={3}
                  value={sym.glyph}
                  onChange={(e) => updateSymbol(idx, { glyph: e.target.value })}
                  className="w-12 min-h-[38px] text-center rounded-lg bg-black/40 border border-white/15 text-base font-bold text-white"
                />
                <input
                  type="text"
                  value={sym.name}
                  onChange={(e) => updateSymbol(idx, { name: e.target.value })}
                  className="flex-1 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                />
                <input
                  type="color"
                  value={sym.color}
                  onChange={(e) => updateSymbol(idx, { color: e.target.value })}
                  className="w-10 h-9 rounded-lg bg-black/40 border border-white/15"
                />
                <button
                  type="button"
                  disabled={cfg.symbols.length <= 3}
                  onClick={() =>
                    onUpdateConfig(
                      'slots',
                      { ...cfg, symbols: cfg.symbols.filter((_, i) => i !== idx) },
                      'Suppression symbole bandit manchot',
                    )
                  }
                  className="p-2 rounded-lg bg-rose-500/15 text-rose-300 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'lottery') {
    const cfg = state.config.lottery;
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white">9. Loterie Quotidienne</h2>
          <button
            type="button"
            onClick={onForceLotteryDrawNow}
            className="px-3.5 py-2 min-h-[40px] rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer"
          >
            Déclencher le tirage actuel (Test)
          </button>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Heure tirage</span>
            <input
              type="number"
              min={0}
              max={23}
              value={cfg.drawHour}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, drawHour: Math.min(23, Math.max(0, Number(e.target.value))) },
                  'Modification heure tirage loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Minute tirage</span>
            <input
              type="number"
              min={0}
              max={59}
              value={cfg.drawMinute}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, drawMinute: Math.min(59, Math.max(0, Number(e.target.value))) },
                  'Modification minute tirage loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Clôture avant tirage (min)</span>
            <input
              type="number"
              min={0}
              max={60}
              value={cfg.cutoffMinutesBeforeDraw}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, cutoffMinutesBeforeDraw: Math.max(0, Number(e.target.value)) },
                  'Modification clôture loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Max numéros (défaut 28)</span>
            <input
              type="number"
              min={10}
              max={50}
              value={cfg.maxNumber}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, maxNumber: Math.max(10, Number(e.target.value)) },
                  'Modification plage numéros loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Numéros principaux</span>
            <input
              type="number"
              min={3}
              max={8}
              value={cfg.mainPickCount}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, mainPickCount: Math.min(8, Math.max(3, Number(e.target.value))) },
                  'Modification nb numéros principaux loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Bonus complémentaire (€)</span>
            <input
              type="number"
              step="0.05"
              min="0"
              value={cfg.complementaryBonus}
              onChange={(e) =>
                onUpdateConfig(
                  'lottery',
                  { ...cfg, complementaryBonus: Math.max(0, Number(e.target.value)) },
                  'Modification bonus complémentaire loterie',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-amber-300 font-mono-tabular"
            />
          </label>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
          <span className="text-xs font-semibold text-white block">Barème par numéros trouvés (€)</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {Array.from({ length: cfg.mainPickCount + 1 }, (_, count) => (
              <label key={count} className="block rounded-xl bg-black/30 p-3">
                <span className="text-slate-400 block mb-1">{count} numéro(s)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={cfg.prizeScale[count] ?? 0}
                  onChange={(e) =>
                    onUpdateConfig(
                      'lottery',
                      {
                        ...cfg,
                        prizeScale: { ...cfg.prizeScale, [count]: Math.max(0, Number(e.target.value)) },
                      },
                      `Modification barème loterie (${count} numéros)`,
                    )
                  }
                  className="w-full min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-amber-300 font-mono-tabular"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'stopwatch') {
    const cfg = state.config.stopwatch;
    const allActivities: Array<{ key: ActivityKey; label: string }> = [
      { key: 'tickets', label: 'Tickets à gratter' },
      { key: 'wheel', label: 'Grande Roue' },
      { key: 'slots', label: 'Bandit manchot' },
      { key: 'lottery', label: 'Loterie' },
    ];

    const toggleAct = (key: ActivityKey) => {
      const exists = cfg.trackedActivities.includes(key);
      const next = exists
        ? cfg.trackedActivities.filter((k) => k !== key)
        : [...cfg.trackedActivities, key];
      onUpdateConfig('stopwatch', { ...cfg, trackedActivities: next }, 'Modification activités chronomètre');
    };

    const totalMinutes = Math.floor(state.stopwatch.totalActiveSeconds / 60);
    const nextThresholdMin = getNextStopwatchThreshold(
      totalMinutes,
      state.stopwatch.awardedThresholds,
      cfg,
    );

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-white">10. Chronomètre de Jeu Actif</h2>
            <p className="text-xs text-slate-400">
              Visible uniquement par Jean · Comptabilisation silencieuse pendant les jeux actifs d&apos;Erika.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleStopwatchPause}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
              manualStopwatchPaused
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/10 hover:bg-white/15 text-slate-200'
            }`}
          >
            {manualStopwatchPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{manualStopwatchPaused ? 'Reprendre le suivi' : 'Mettre en pause'}</span>
          </button>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Temps cumulé actuel</span>
            <span className="font-mono-tabular text-xl font-bold text-sky-300">
              {formatDurationHms(state.stopwatch.totalActiveSeconds)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              {manualStopwatchPaused ? 'En pause manuelle' : state.stopwatch.isPaused ? `En pause (${state.stopwatch.pauseReason ?? 'hors jeu'})` : 'Suivi actif'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Prochain palier</span>
            <span className="font-mono-tabular text-base font-bold text-amber-300">
              {nextThresholdMin} min (+{formatEuro(cfg.rewardPerThreshold)})
            </span>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-400 block">Paliers déjà crédités</span>
            <span className="font-mono-tabular text-slate-200">
              {state.stopwatch.awardedThresholds.length > 0
                ? state.stopwatch.awardedThresholds.map((m) => `${m}m`).join(', ')
                : 'Aucun'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-4 text-xs">
          <div>
            <span className="font-semibold text-white block mb-2">Activités comptabilisées</span>
            <div className="flex flex-wrap gap-2">
              {allActivities.map((act) => {
                const active = cfg.trackedActivities.includes(act.key);
                return (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => toggleAct(act.key)}
                    className={`px-3.5 py-2 min-h-[40px] rounded-xl font-semibold cursor-pointer ${
                      active ? 'bg-blue-600 text-white' : 'bg-black/35 text-slate-400 border border-white/10'
                    }`}
                  >
                    {act.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-slate-300 block mb-1">Récompense par palier (€)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cfg.rewardPerThreshold}
                onChange={(e) =>
                  onUpdateConfig(
                    'stopwatch',
                    { ...cfg, rewardPerThreshold: Math.max(0, Number(e.target.value)) },
                    'Modification récompense chronomètre',
                  )
                }
                className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-amber-300 font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Répétition ensuite (minutes)</span>
              <input
                type="number"
                min={1}
                value={cfg.repeatIntervalMinutes}
                onChange={(e) =>
                  onUpdateConfig(
                    'stopwatch',
                    { ...cfg, repeatIntervalMinutes: Math.max(1, Number(e.target.value)) },
                    'Modification intervalle récurrent chronomètre',
                  )
                }
                className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Pause auto si inactif (secondes)</span>
              <input
                type="number"
                min={10}
                value={cfg.autoPauseIdleSeconds}
                onChange={(e) =>
                  onUpdateConfig(
                    'stopwatch',
                    { ...cfg, autoPauseIdleSeconds: Math.max(10, Number(e.target.value)) },
                    'Modification délai pause inactivité',
                  )
                }
                className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-slate-300 block mb-1">
              Seuils initiaux en minutes (séparés par des virgules)
            </span>
            <input
              type="text"
              value={cfg.initialThresholdsMinutes.join(', ')}
              onChange={(e) => {
                const nums = e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0);
                if (nums.length > 0) {
                  onUpdateConfig(
                    'stopwatch',
                    { ...cfg, initialThresholdsMinutes: nums },
                    'Modification seuils initiaux chronomètre',
                  );
                }
              }}
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-sky-300 font-mono-tabular"
            />
          </label>
        </div>
      </div>
    );
  }

  // Milestones (Section 11)
  const cfg = state.config.milestones;
  const pending = state.milestones.filter((m) => m.status === 'PENDING');
  const resolved = state.milestones.filter((m) => m.status !== 'PENDING');

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-bold text-white">11. Gestion des Paliers</h2>

      <div className="rounded-2xl vc-card-relief p-4 space-y-3">
        <h3 className="font-semibold text-sm text-amber-300">
          Demandes de validation en attente ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun palier en attente de validation.</p>
        ) : (
          pending.map((m) => (
            <div key={m.id} className="rounded-xl bg-black/35 border border-white/10 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-white">
                  Palier de {formatEuro(m.thresholdAmount)} atteint (solde :{' '}
                  {formatEuro(m.cycleBalanceAtTrigger)})
                </span>
                <span className="text-slate-400">{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <input
                type="text"
                value={milestoneNote}
                onChange={(e) => setMilestoneNote(e.target.value)}
                placeholder="Note optionnelle de Jean..."
                className="w-full min-h-[40px] rounded-lg bg-black/40 border border-white/15 px-3 text-xs text-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onValidateMilestone(m.id, milestoneNote);
                    setMilestoneNote('');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider et remettre le cycle à 0</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRejectMilestone(m.id, milestoneNote)}
                  className="px-4 py-2 min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs cursor-pointer"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
        <label className="block">
          <span className="text-slate-300 block mb-1">Montant du palier (€ fictifs)</span>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={cfg.thresholdAmount}
            onChange={(e) =>
              onUpdateConfig(
                'milestones',
                { ...cfg, thresholdAmount: Math.max(0.1, Number(e.target.value)) },
                'Modification seuil palier',
              )
            }
            className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-amber-300 font-mono-tabular"
          />
        </label>
        <label className="block">
          <span className="text-slate-300 block mb-1">Message affiché à Erika lors de l&apos;attente</span>
          <input
            type="text"
            value={cfg.pendingMessage}
            onChange={(e) =>
              onUpdateConfig(
                'milestones',
                { ...cfg, pendingMessage: e.target.value },
                'Modification message palier en attente',
              )
            }
            className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
          />
        </label>
        <label className="block">
          <span className="text-slate-300 block mb-1">Message après validation par Jean</span>
          <input
            type="text"
            value={cfg.validatedMessage}
            onChange={(e) =>
              onUpdateConfig(
                'milestones',
                { ...cfg, validatedMessage: e.target.value },
                'Modification message palier validé',
              )
            }
            className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
          />
        </label>
        <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.resetCycleOnValidation}
            onChange={(e) =>
              onUpdateConfig(
                'milestones',
                { ...cfg, resetCycleOnValidation: e.target.checked },
                'Modification règle remise à zéro cycle palier',
              )
            }
            className="w-4 h-4 accent-amber-400"
          />
          <span className="text-slate-200">
            Remettre le solde du cycle à zéro après validation (total cumulé toujours conservé)
          </span>
        </label>
      </div>

      {resolved.length > 0 && (
        <div className="rounded-2xl vc-card-relief p-4 space-y-2 text-xs">
          <h3 className="font-semibold text-white">Historique des paliers traités ({resolved.length})</h3>
          {resolved.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <span className="font-semibold text-slate-200">
                  {formatEuro(m.thresholdAmount)} ({m.status === 'VALIDATED' ? 'Validé' : 'Refusé'})
                </span>
                {m.note && <span className="text-slate-400 ml-2">· {m.note}</span>}
              </div>
              <span className="text-slate-400">
                {new Date(m.validatedAt ?? m.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
