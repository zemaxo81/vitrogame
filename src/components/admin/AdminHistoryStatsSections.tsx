import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Coins, ShieldCheck, Ticket } from 'lucide-react';
import { formatCents, formatEuro } from '../../engine/rng';
import { formatDurationHms } from '../../engine/stopwatch';
import { AppConfig, AppState, RenewalMode } from '../../types/vitrocash';

interface AdminHistoryStatsSectionsProps {
  section: 'dashboard' | 'balances' | 'rewards' | 'history' | 'stats';
  state: AppState;
  now: number;
  onJumpSection: (sec: string) => void;
  onUpdateConfig: (section: keyof AppConfig, value: unknown, auditSummary: string) => void;
}

export const AdminHistoryStatsSections: React.FC<AdminHistoryStatsSectionsProps> = ({
  section,
  state,
  now,
  onJumpSection,
  onUpdateConfig,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'positive' | 'zero'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [histTab, setHistTab] = useState<'events' | 'audit'>('events');
  const [diagReport, setDiagReport] = useState<string[] | null>(null);

  const runLiveDiagnostics = async () => {
    const checks: string[] = [];
    checks.push(`Catalogue tickets : ${state.ticketsCatalog.length} modèle(s) (${state.ticketsCatalog.filter((t) => t.status === 'active').length} actifs).`);
    const uniqueIds = new Set(state.creditedEventIds);
    checks.push(
      uniqueIds.size === state.creditedEventIds.length
        ? `Registre anti-doublons : OK (${uniqueIds.size} IDs uniques).`
        : 'Registre anti-doublons : doublon détecté !',
    );
    const wheelSum = Math.round(state.config.wheel.segments.reduce((s, seg) => s + seg.probability, 0) * 100) / 100;
    const slotSum = Math.round(state.config.slots.outcomes.reduce((s, o) => s + o.probability, 0) * 100) / 100;
    checks.push(`Probabilités Roue : ${wheelSum} % · Bandit Manchot : ${slotSum} %.`);
    checks.push(
      typeof indexedDB !== 'undefined'
        ? 'IndexedDB locale : disponible et active.'
        : 'IndexedDB indisponible (repli localStorage actif).',
    );
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      checks.push(`Service Worker hors connexion : ${regs.length > 0 ? 'enregistré' : 'prêt au build PWA'}.`);
    }
    setDiagReport(checks);
  };

  const stats = useMemo(() => {
    const byCat: Record<string, { count: number; positive: number; zero: number; total: number }> = {
      tickets: { count: 0, positive: 0, zero: 0, total: 0 },
      wheel: { count: 0, positive: 0, zero: 0, total: 0 },
      slots: { count: 0, positive: 0, zero: 0, total: 0 },
      lottery: { count: 0, positive: 0, zero: 0, total: 0 },
      stopwatch: { count: 0, positive: 0, zero: 0, total: 0 },
    };

    const byTicket: Record<string, { count: number; positive: number; total: number }> = {};

    let totalPositive = 0;
    let totalZero = 0;

    for (const h of state.history) {
      if (byCat[h.category]) {
        byCat[h.category].count += 1;
        byCat[h.category].total = Math.round((byCat[h.category].total + h.amount) * 100) / 100;
        if (h.amount > 0) {
          byCat[h.category].positive += 1;
          totalPositive += 1;
        } else {
          byCat[h.category].zero += 1;
          totalZero += 1;
        }
      }

      if (h.category === 'tickets' && h.ticketName) {
        if (!byTicket[h.ticketName]) {
          byTicket[h.ticketName] = { count: 0, positive: 0, total: 0 };
        }
        byTicket[h.ticketName].count += 1;
        if (h.amount > 0) byTicket[h.ticketName].positive += 1;
        byTicket[h.ticketName].total =
          Math.round((byTicket[h.ticketName].total + h.amount) * 100) / 100;
      }
    }

    return { byCat, byTicket, totalPositive, totalZero };
  }, [state.history]);

  const filteredHistory = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const yesterdayMs = todayMs - 86400_000;

    return state.history.filter((ev) => {
      if (periodFilter === 'today' && ev.timestamp < todayMs) return false;
      if (periodFilter === 'yesterday' && (ev.timestamp < yesterdayMs || ev.timestamp >= todayMs)) return false;
      if (periodFilter === 'week' && ev.timestamp < now - 7 * 86400_000) return false;
      if (periodFilter === 'month' && ev.timestamp < now - 30 * 86400_000) return false;
      if (periodFilter === 'custom') {
        if (customStart && ev.timestamp < new Date(customStart).getTime()) return false;
        if (customEnd && ev.timestamp > new Date(customEnd).getTime() + 86400_000) return false;
      }
      if (activityFilter !== 'all' && ev.category !== activityFilter) return false;
      if (ticketFilter !== 'all' && ev.ticketName !== ticketFilter) return false;
      if (resultFilter === 'positive' && ev.amount <= 0) return false;
      if (resultFilter === 'zero' && ev.amount > 0) return false;
      if (minAmount && ev.amount < Number(minAmount)) return false;
      return true;
    });
  }, [
    state.history,
    periodFilter,
    customStart,
    customEnd,
    activityFilter,
    ticketFilter,
    resultFilter,
    minAmount,
    now,
  ]);

  if (section === 'dashboard') {
    const pendingMilestones = state.milestones.filter((m) => m.status === 'PENDING');
    const currentDraw = state.lotteryDraws[state.currentLotteryKey];

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Tableau de bord · Jean</h2>
            <p className="text-xs text-slate-400">
              État local : Opérationnel · Stockage persistant hors connexion actif
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runLiveDiagnostics()}
              className="px-3.5 py-2 min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sky-300 font-semibold text-xs cursor-pointer"
            >
              Auto-diagnostic local
            </button>
            {pendingMilestones.length > 0 && (
              <button
                type="button"
                onClick={() => onJumpSection('milestones')}
                className="px-4 py-2 min-h-[42px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {pendingMilestones.length} palier(s) à valider
              </button>
            )}
          </div>
        </div>

        {diagReport && (
          <div className="rounded-2xl vc-card-relief p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-300">Rapport d&apos;auto-diagnostic local</span>
              <button
                type="button"
                onClick={() => setDiagReport(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Fermer
              </button>
            </div>
            <ul className="space-y-1 text-slate-200 list-disc list-inside">
              {diagReport.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Solde du cycle</div>
            <div className="font-display text-xl font-extrabold text-amber-300 tabular-nums mt-1">
              {formatCents(state.cycleBalanceCents)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Palier : {formatEuro(state.config.milestones.thresholdAmount)}
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Total cumulé</div>
            <div className="font-display text-xl font-extrabold text-white tabular-nums mt-1">
              {formatCents(state.cumulativeTotalCents)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {state.creditedEventIds.length} gain(s) crédités
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Temps de jeu actif</div>
            <div className="font-display text-lg font-extrabold text-sky-300 font-mono-tabular mt-1">
              {formatDurationHms(state.stopwatch.totalActiveSeconds)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {state.stopwatch.awardedThresholds.length} palier(s) chrono
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Tickets dispo</div>
            <div className="font-mono-tabular text-lg font-bold text-white mt-1">
              {state.ticketQuota.remaining} / {state.ticketQuota.maxAttempts}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {state.ticketsCatalog.filter((t) => t.status === 'active').length} modèles actifs
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Roue & Slots</div>
            <div className="font-mono-tabular text-xs font-bold text-white mt-1">
              Roue {state.wheelQuota.remaining}/{state.wheelQuota.maxAttempts} · Slots {state.slotQuota.remaining}/{state.slotQuota.maxAttempts}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Cycles : {state.config.wheel.intervalHours}h / {state.config.slots.intervalHours}h
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-3.5">
            <div className="text-[11px] text-slate-400">Loterie</div>
            <div className="font-mono-tabular text-xs font-bold text-white mt-1">
              {currentDraw?.drawKey ?? '—'} · {String(state.config.lottery.drawHour).padStart(2, '0')}h
              {String(state.config.lottery.drawMinute).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {currentDraw?.playerNumbers ? 'Grille validée' : 'En attente'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Dernières activités</h3>
            <button
              type="button"
              onClick={() => onJumpSection('history')}
              className="text-xs text-sky-300 hover:underline cursor-pointer"
            >
              Tout voir
            </button>
          </div>
          {state.history.slice(0, 6).map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0"
            >
              <div className="min-w-0 pr-3">
                <div className="font-medium text-slate-100 truncate">{h.title}</div>
                <div className="text-slate-400">{new Date(h.timestamp).toLocaleString('fr-FR')}</div>
              </div>
              <div className="font-mono-tabular font-bold text-amber-300 shrink-0">
                +{formatEuro(h.amount)}
              </div>
            </div>
          ))}
          {state.history.length === 0 && (
            <p className="text-xs text-slate-400">Aucune activité enregistrée pour le moment.</p>
          )}
        </div>
      </div>
    );
  }

  if (section === 'balances') {
    return (
      <div className="space-y-5">
        <h2 className="font-display text-xl font-bold text-white">4. Soldes et Compteurs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl vc-card-relief p-4 space-y-1">
            <div className="inline-flex items-center gap-2 text-xs text-slate-400">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Solde du cycle actuel</span>
            </div>
            <div className="font-display text-3xl font-extrabold text-amber-300 tabular-nums">
              {formatCents(state.cycleBalanceCents)}
            </div>
          </div>
          <div className="rounded-2xl vc-card-relief p-4 space-y-1">
            <div className="inline-flex items-center gap-2 text-xs text-slate-400">
              <Award className="w-4 h-4 text-sky-400" />
              <span>Total cumulé depuis le début</span>
            </div>
            <div className="font-display text-3xl font-extrabold text-white tabular-nums">
              {formatCents(state.cumulativeTotalCents)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-black/30 p-3">
            <div className="text-slate-400">Compteur Tickets</div>
            <div className="font-bold text-white mt-0.5">
              {state.ticketQuota.remaining} / {state.ticketQuota.maxAttempts} · {state.ticketQuota.intervalHours}h
            </div>
            <div className="text-slate-500 mt-0.5">{state.ticketQuota.renewalMode}</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <div className="text-slate-400">Compteur Roue</div>
            <div className="font-bold text-white mt-0.5">
              {state.wheelQuota.remaining} / {state.wheelQuota.maxAttempts} · {state.wheelQuota.intervalHours}h
            </div>
            <div className="text-slate-500 mt-0.5">{state.wheelQuota.renewalMode}</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <div className="text-slate-400">Compteur Bandit Manchot</div>
            <div className="font-bold text-white mt-0.5">
              {state.slotQuota.remaining} / {state.slotQuota.maxAttempts} · {state.slotQuota.intervalHours}h
            </div>
            <div className="text-slate-500 mt-0.5">{state.slotQuota.renewalMode}</div>
          </div>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Intégrité anti-double comptabilisation</span>
          </div>
          <p className="text-slate-300">
            Identifiants d&apos;événements crédités uniques enregistrés :{' '}
            <strong className="font-mono-tabular text-white">{state.creditedEventIds.length}</strong>.
          </p>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <h3 className="font-semibold text-white">Fréquence de renouvellement des Tickets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-slate-400 block mb-1">Tickets par série</span>
              <input
                type="number"
                min={1}
                max={10}
                value={state.config.tickets.batchSize}
                onChange={(e) =>
                  onUpdateConfig(
                    'tickets',
                    { ...state.config.tickets, batchSize: Math.max(1, Number(e.target.value)) },
                    'Modification taille série tickets',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 block mb-1">Intervalle (heures)</span>
              <input
                type="number"
                min={1}
                max={72}
                value={state.config.tickets.intervalHours}
                onChange={(e) =>
                  onUpdateConfig(
                    'tickets',
                    { ...state.config.tickets, intervalHours: Math.max(1, Number(e.target.value)) },
                    'Modification intervalle tickets',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 block mb-1">Mode renouvellement</span>
              <select
                value={state.config.tickets.renewalMode}
                onChange={(e) =>
                  onUpdateConfig(
                    'tickets',
                    { ...state.config.tickets, renewalMode: e.target.value as RenewalMode },
                    'Modification mode renouvellement tickets',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
              >
                <option value="FIXED_INTERVAL">Intervalles fixes</option>
                <option value="AFTER_CONSUMPTION">Après consommation</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'rewards') {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white">5. Synthèse des Récompenses</h2>
        <div className="grid grid-cols-1 gap-3 text-xs">
          <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>Tickets ({state.ticketsCatalog.length} modèles)</span>
              </span>
              <button
                type="button"
                onClick={() => onJumpSection('tickets')}
                className="text-sky-300 hover:underline cursor-pointer"
              >
                Éditer →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 tabular-nums">
              {state.ticketsCatalog[0]?.probabilities.map((p) => (
                <div key={p.id} className="rounded-lg bg-black/30 px-2.5 py-1.5 flex justify-between">
                  <span className="text-amber-300 font-semibold">{formatEuro(p.amount)}</span>
                  <span className="text-slate-300">{p.probability} %</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>Roue ({state.config.wheel.segments.length} segments)</span>
              </span>
              <button
                type="button"
                onClick={() => onJumpSection('wheel')}
                className="text-sky-300 hover:underline cursor-pointer"
              >
                Éditer →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 tabular-nums">
              {state.config.wheel.segments.map((s) => (
                <div key={s.id} className="rounded-lg bg-black/30 px-2.5 py-1.5 flex justify-between">
                  <span className="text-amber-300 font-semibold">{s.label}</span>
                  <span className="text-slate-300">{s.probability} %</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Bandit Manchot</span>
              <button
                type="button"
                onClick={() => onJumpSection('slots')}
                className="text-sky-300 hover:underline cursor-pointer"
              >
                Éditer →
              </button>
            </div>
            <div className="space-y-1.5 tabular-nums">
              {state.config.slots.outcomes.map((o) => (
                <div key={o.id} className="rounded-lg bg-black/30 px-2.5 py-1.5 flex justify-between">
                  <span className="text-amber-300 font-semibold">{formatEuro(o.amount)}</span>
                  <span className="text-slate-300">{o.probability} %</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl vc-card-relief p-4 space-y-2.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Loterie & Chronomètre</span>
              </span>
              <button
                type="button"
                onClick={() => onJumpSection('lottery')}
                className="text-sky-300 hover:underline cursor-pointer"
              >
                Éditer →
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed tabular-nums">
              Loterie : 0→{formatEuro(state.config.lottery.prizeScale[0] ?? 0)}, 1→
              {formatEuro(state.config.lottery.prizeScale[1] ?? 0)}, 2→
              {formatEuro(state.config.lottery.prizeScale[2] ?? 0)}, 3→
              {formatEuro(state.config.lottery.prizeScale[3] ?? 0)}, 4→
              {formatEuro(state.config.lottery.prizeScale[4] ?? 0)}, 5→
              {formatEuro(state.config.lottery.prizeScale[5] ?? 0)} · Complémentaire +
              {formatEuro(state.config.lottery.complementaryBonus)}.
              <br />
              Chronomètre : +{formatEuro(state.config.stopwatch.rewardPerThreshold)} par palier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'history') {
    const ticketNames = Array.from(
      new Set(state.history.map((h) => h.ticketName).filter((n): n is string => Boolean(n))),
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white">12. Historique Administrateur</h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setHistTab('events')}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold cursor-pointer ${
                histTab === 'events' ? 'bg-blue-600 text-white' : 'bg-[#140C2B] text-slate-300'
              }`}
            >
              Événements & Gains ({state.history.length})
            </button>
            <button
              type="button"
              onClick={() => setHistTab('audit')}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold cursor-pointer ${
                histTab === 'audit' ? 'bg-amber-500 text-slate-950' : 'bg-[#140C2B] text-slate-300'
              }`}
            >
              Journal Admin ({state.adminAudit.length})
            </button>
          </div>
        </div>

        {histTab === 'events' ? (
          <>
            <div className="rounded-2xl vc-card-relief p-3.5 grid grid-cols-1 gap-2.5 text-xs">
              <label className="block">
                <span className="text-slate-400 block mb-1">Période</span>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
                  className="w-full min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                >
                  <option value="all">Tout</option>
                  <option value="today">Aujourd&apos;hui</option>
                  <option value="yesterday">Hier</option>
                  <option value="week">Cette semaine (7j)</option>
                  <option value="month">Ce mois (30j)</option>
                  <option value="custom">Période personnalisée</option>
                </select>
              </label>

              <label className="block">
                <span className="text-slate-400 block mb-1">Activité</span>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                >
                  <option value="all">Toutes</option>
                  <option value="tickets">Tickets</option>
                  <option value="wheel">Roue</option>
                  <option value="slots">Bandit manchot</option>
                  <option value="lottery">Loterie</option>
                  <option value="stopwatch">Chronomètre</option>
                  <option value="milestone">Paliers</option>
                </select>
              </label>

              <label className="block">
                <span className="text-slate-400 block mb-1">Ticket</span>
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                >
                  <option value="all">Tous</option>
                  {ticketNames.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-slate-400 block mb-1">Résultat & Montant min (€)</span>
                <div className="flex gap-1.5">
                  <select
                    value={resultFilter}
                    onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
                    className="flex-1 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2 text-white"
                  >
                    <option value="all">Tous</option>
                    <option value="positive">Positifs</option>
                    <option value="zero">Nuls (0 €)</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Min €"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-20 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2 font-mono-tabular text-white"
                  />
                </div>
              </label>

              {periodFilter === 'custom' && (
                <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 text-white"
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl vc-card-relief divide-y divide-white/10">
              {filteredHistory.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Aucun résultat.</div>
              ) : (
                filteredHistory.map((h) => (
                  <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{h.title}</div>
                      <div className="text-slate-400">
                        {new Date(h.timestamp).toLocaleString('fr-FR')} · {h.description}
                      </div>
                    </div>
                    <span className="font-mono-tabular font-bold text-amber-300 shrink-0">
                      +{formatEuro(h.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl vc-card-relief divide-y divide-white/10">
            {state.adminAudit.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Aucune action admin enregistrée.</div>
            ) : (
              state.adminAudit.map((a) => (
                <div key={a.id} className="px-4 py-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-amber-300">
                      {a.section} · {a.action}
                    </span>
                    <span className="text-slate-400">{new Date(a.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="text-slate-200 mt-0.5">{a.summary}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Stats (Section 13)
  const ticketStatsEntries = Object.entries(stats.byTicket).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-white">13. Statistiques Complètes</h2>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-2xl vc-card-relief p-3.5">
          <span className="text-[11px] text-slate-400 block">Solde cycle</span>
          <span className="font-mono-tabular text-lg font-bold text-amber-300">
            {formatCents(state.cycleBalanceCents)}
          </span>
        </div>
        <div className="rounded-2xl vc-card-relief p-3.5">
          <span className="text-[11px] text-slate-400 block">Total cumulé</span>
          <span className="font-mono-tabular text-lg font-bold text-white">
            {formatCents(state.cumulativeTotalCents)}
          </span>
        </div>
        <div className="rounded-2xl vc-card-relief p-3.5">
          <span className="text-[11px] text-slate-400 block">Positifs / Nuls</span>
          <span className="font-mono-tabular text-lg font-bold text-sky-300">
            {stats.totalPositive} / {stats.totalZero}
          </span>
        </div>
        <div className="rounded-2xl vc-card-relief p-3.5">
          <span className="text-[11px] text-slate-400 block">Paliers validés</span>
          <span className="font-mono-tabular text-lg font-bold text-emerald-300">
            {state.milestones.filter((m) => m.status === 'VALIDATED').length}
          </span>
        </div>
      </div>

      <div className="rounded-2xl vc-card-relief overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/35 text-slate-400">
            <tr>
              <th className="px-4 py-3">Activité</th>
              <th className="px-4 py-3 text-right">Participations</th>
              <th className="px-4 py-3 text-right">Positifs</th>
              <th className="px-4 py-3 text-right">Nuls</th>
              <th className="px-4 py-3 text-right">Gains (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 tabular-nums">
            {(
              [
                ['tickets', 'Tickets à gratter'],
                ['wheel', 'Grande Roue'],
                ['slots', 'Bandit Manchot'],
                ['lottery', 'Loterie'],
                ['stopwatch', 'Chronomètre'],
              ] as const
            ).map(([k, label]) => (
              <tr key={k}>
                <td className="px-4 py-3 font-medium text-white">{label}</td>
                <td className="px-4 py-3 text-right text-slate-300">{stats.byCat[k].count}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{stats.byCat[k].positive}</td>
                <td className="px-4 py-3 text-right text-slate-400">{stats.byCat[k].zero}</td>
                <td className="px-4 py-3 text-right font-mono-tabular font-bold text-amber-300">
                  {formatEuro(stats.byCat[k].total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ticketStatsEntries.length > 0 && (
        <div className="rounded-2xl vc-card-relief overflow-x-auto">
          <div className="px-4 py-3 border-b border-white/10 text-xs font-semibold text-white">
            Détail par ticket joué (y compris archivés)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-black/35 text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Ticket</th>
                <th className="px-4 py-2.5 text-right">Grattages</th>
                <th className="px-4 py-2.5 text-right">Gagnants</th>
                <th className="px-4 py-2.5 text-right">Total (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 tabular-nums">
              {ticketStatsEntries.map(([name, st]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-medium text-white">{name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300">{st.count}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-300">{st.positive}</td>
                  <td className="px-4 py-2.5 text-right font-mono-tabular font-bold text-amber-300">
                    {formatEuro(st.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
