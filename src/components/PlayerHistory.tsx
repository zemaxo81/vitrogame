import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Filter, X } from 'lucide-react';
import { formatEuro } from '../engine/rng';
import { HistoryCategory, HistoryEvent } from '../types/vitrocash';

interface PlayerHistoryProps {
  history: HistoryEvent[];
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month';

const CATEGORY_LABELS: Record<HistoryCategory | 'all', string> = {
  all: 'Tout',
  ticket: 'Tickets',
  tickets: 'Tickets',
  wheel: 'Roue',
  slots: 'Bandit Manchot',
  lottery: 'Loterie',
  stopwatch: 'Chronomètre',
  milestone: 'Paliers',
  admin: 'Admin',
} as Record<string, string>;

export const PlayerHistory: React.FC<PlayerHistoryProps> = ({ history }) => {
  const [catFilter, setCatFilter] = useState<'all' | HistoryCategory>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);

  const playerEvents = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return history.filter((ev) => {
      if (ev.category === 'admin' || ev.category === 'stopwatch') return false;
      if (catFilter !== 'all' && ev.category !== catFilter) return false;
      if (periodFilter === 'today' && ev.timestamp < startOfToday.getTime()) return false;
      if (periodFilter === 'week' && ev.timestamp < now - 7 * 86400_000) return false;
      if (periodFilter === 'month' && ev.timestamp < now - 30 * 86400_000) return false;
      return true;
    });
  }, [history, catFilter, periodFilter]);

  const totalsByCategory = useMemo(() => {
    const sums: Record<string, { count: number; amount: number }> = {
      tickets: { count: 0, amount: 0 },
      wheel: { count: 0, amount: 0 },
      slots: { count: 0, amount: 0 },
      lottery: { count: 0, amount: 0 },
      milestone: { count: 0, amount: 0 },
    };
    for (const ev of playerEvents) {
      if (sums[ev.category]) {
        sums[ev.category].count += 1;
        sums[ev.category].amount = Math.round((sums[ev.category].amount + ev.amount) * 100) / 100;
      }
    }
    return sums;
  }, [playerEvents]);

  return (
    <div className="space-y-4">
      {/* Summary Totals Strip */}
      <div className="rounded-2xl vc-card-relief p-4">
        <h2 className="font-display text-lg font-bold text-white mb-3">Historique d&apos;Erika</h2>
        <div className="grid grid-cols-6 gap-2">
          {(
            [
              ['tickets', 'Tickets', 'col-span-2'],
              ['wheel', 'Roue', 'col-span-2'],
              ['slots', 'Slots', 'col-span-2'],
              ['lottery', 'Loterie', 'col-span-3'],
              ['milestone', 'Paliers', 'col-span-3'],
            ] as const
          ).map(([key, label, spanClass]) => (
            <div key={key} className={`${spanClass} rounded-xl vc-inset-well p-2.5`}>
              <div className="text-[11px] text-slate-400 truncate">{label}</div>
              <div className="font-mono-tabular font-bold text-sm text-amber-300 mt-0.5">
                {formatEuro(totalsByCategory[key].amount)}
              </div>
              <div className="text-[10px] text-slate-500 tabular-nums truncate">
                {totalsByCategory[key].count} act.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl vc-card-relief p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <span>Activité</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'tickets', 'wheel', 'slots', 'lottery', 'milestone'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  catFilter === cat
                    ? 'vc-btn-electric'
                    : 'bg-black/30 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ),
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium pt-1">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Période</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'Tout'],
              ['today', "Aujourd'hui"],
              ['week', '7 jours'],
              ['month', '30 jours'],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                periodFilter === p
                  ? 'vc-btn-gold'
                  : 'bg-black/30 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological List */}
      <div className="rounded-2xl vc-card-relief divide-y divide-white/10 overflow-hidden">
        {playerEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Aucun événement enregistré pour ces filtres.
          </div>
        ) : (
          playerEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEvent(ev)}
              className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 cursor-pointer min-h-[64px]"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-white truncate">{ev.title}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {new Date(ev.timestamp).toLocaleString('fr-FR')} · {CATEGORY_LABELS[ev.category] ?? ev.category}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-mono-tabular font-bold text-sm ${
                    ev.amount > 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  +{formatEuro(ev.amount)}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl vc-card-relief p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-sky-300">
                  {CATEGORY_LABELS[selectedEvent.category] ?? selectedEvent.category} ·{' '}
                  {new Date(selectedEvent.timestamp).toLocaleString('fr-FR')}
                </p>
                <h3 className="font-display text-lg font-bold text-white mt-1">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300">{selectedEvent.description}</p>
            <div className="rounded-xl bg-black/35 p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Montant crédité (fictif)</span>
                <span className="font-mono-tabular font-bold text-amber-300">
                  {formatEuro(selectedEvent.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Identifiant unique</span>
                <span className="font-mono-tabular text-slate-300">{selectedEvent.id}</span>
              </div>
              {Object.entries(selectedEvent.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono-tabular text-slate-200 text-right truncate max-w-[200px]">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-sm cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
