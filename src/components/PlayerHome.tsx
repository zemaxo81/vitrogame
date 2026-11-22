import React, { useState } from 'react';
import {
  Award,
  BellRing,
  CalendarClock,
  ChevronRight,
  Clock,
  History,
  PlaySquare,
  RotateCw,
  Ticket,
} from 'lucide-react';
import { formatCents, formatEuro } from '../engine/rng';
import {
  getNotificationPermissionState,
  NotificationPermState,
  requestRenewalNotificationPermission,
} from '../notifications/renewalNotifier';
import { AppState } from '../types/vitrocash';
import { CoinArtwork } from './CoinArtwork';
import { PWAInstallButton } from './PWAInstallButton';

export type PlayerTab = 'home' | 'tickets' | 'wheel' | 'slots' | 'lottery' | 'history';

interface PlayerHomeProps {
  state: AppState;
  now: number;
  onNavigate: (tab: PlayerTab) => void;
}

function shortCountdown(targetMs: number | null, now: number): string {
  if (!targetMs) return 'Prêt';
  const diff = Math.max(0, Math.floor((targetMs - now) / 1000));
  if (diff === 0) return 'Prêt';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export const PlayerHome: React.FC<PlayerHomeProps> = ({
  state,
  now,
  onNavigate,
}) => {
  const [notifPerm, setNotifPerm] = useState<NotificationPermState>(() =>
    getNotificationPermissionState(),
  );
  const [notifDismissed, setNotifDismissed] = useState(false);

  const { config, cycleBalanceCents, cumulativeTotalCents, milestones } = state;
  const thresholdCents = Math.max(1, Math.round(config.milestones.thresholdAmount * 100));
  const milestonePct = Math.min(100, Math.round((cycleBalanceCents / thresholdCents) * 100));
  const pendingMilestone = milestones.find((m) => m.status === 'PENDING');

  const currentDraw = state.lotteryDraws[state.currentLotteryKey];
  const padCard = config.appearance.compactCards ? 'p-3' : 'p-3.5';
  const heroGlowStyle =
    config.appearance.glowIntensity === 'high'
      ? {
          boxShadow:
            'inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.55), 0 22px 50px -10px rgba(2,1,10,0.95), 0 0 42px -4px rgba(245,158,11,0.36), 0 0 54px -4px rgba(56,189,248,0.28)',
        }
      : config.appearance.glowIntensity === 'low'
        ? {
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(0,0,0,0.5), 0 12px 24px -8px rgba(2,1,10,0.85)',
          }
        : undefined;

  return (
    <div className={config.appearance.compactCards ? 'space-y-3.5' : 'space-y-4'}>
      {/* Hero Balances & Milestone Vault Card */}
      <section className="rounded-3xl vc-card-hero p-4 relative overflow-hidden" style={heroGlowStyle}>
        <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <p className="text-[11px] text-sky-300 font-semibold tracking-wide truncate">
            Bonjour {config.general.playerName} · {config.general.welcomeSubtitle}
          </p>

          <div className="flex items-center gap-3.5">
            <div className="shrink-0">
              <CoinArtwork
                model={config.splash.coinModel}
                sizePx={50}
                glowEnabled={config.appearance.glowIntensity !== 'low'}
                reflectionEnabled
                rotationSpeedSeconds={5.2}
                animated={config.animations.masterEnabled}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                Solde du cycle
              </span>
              <div className="font-display text-[38px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 drop-shadow-[0_4px_18px_rgba(251,191,36,0.3)] tabular-nums tracking-tight mt-1">
                {formatCents(cycleBalanceCents)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl vc-inset-well px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block">Total cumulé depuis le début</span>
              <div className="font-mono-tabular text-lg font-bold text-white leading-tight mt-0.5">
                {formatCents(cumulativeTotalCents)}
              </div>
            </div>
            <div className="shrink-0">
              <PWAInstallButton compact />
            </div>
          </div>
        </div>

        {/* Milestone Progress Well */}
        <div className="relative z-10 mt-3.5 pt-3.5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Palier : {formatEuro(config.milestones.thresholdAmount)}</span>
            </span>
            <span className="font-mono-tabular text-amber-300 font-bold">{milestonePct} %</span>
          </div>
          <div className="h-3 rounded-full vc-inset-well overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-400 to-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)] transition-all duration-300 relative overflow-hidden"
              style={{ width: `${Math.max(milestonePct > 0 ? 4 : 0, milestonePct)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
            </div>
          </div>

          {pendingMilestone && (
            <div className="mt-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/45 shadow-[inset_0_1px_0_rgba(253,230,138,0.25)] px-3.5 py-2.5 text-xs text-amber-200 leading-relaxed">
              {pendingMilestone.message}
            </div>
          )}
        </div>

        {config.appearance.showDisclaimerBanner && (
          <p className="relative z-10 mt-3 text-[11px] text-slate-400 leading-relaxed">
            {config.general.disclaimerText}
          </p>
        )}
      </section>

      {/* 4 Games Grid 2x2 Android Portrait Tiles */}
      <section className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate('tickets')}
          className={`relative overflow-hidden text-left rounded-2xl vc-card-relief hover:-translate-y-0.5 active:translate-y-0.5 hover:border-amber-300/85 ${padCard} transition-all cursor-pointer group flex flex-col justify-between min-h-[126px]`}
        >
          <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/15 border border-amber-300/40 vc-icon-medallion flex items-center justify-center">
                <Ticket className="w-4 h-4 text-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="font-display text-[15px] leading-tight font-bold text-white">Tickets à Gratter</h3>
              <p className="text-[11px] leading-snug text-slate-400 mt-1 tabular-nums">
                {state.ticketQuota.remaining}/{state.ticketQuota.maxAttempts} dispo ·{' '}
                {shortCountdown(state.ticketQuota.nextRenewalAt, now)}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('wheel')}
          className={`relative overflow-hidden text-left rounded-2xl vc-card-relief hover:-translate-y-0.5 active:translate-y-0.5 hover:border-amber-300/85 ${padCard} transition-all cursor-pointer group flex flex-col justify-between min-h-[126px]`}
        >
          <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400/30 to-blue-600/15 border border-sky-300/40 vc-icon-medallion flex items-center justify-center">
                <RotateCw className="w-4 h-4 text-sky-300 drop-shadow-[0_2px_6px_rgba(56,189,248,0.5)]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="font-display text-[15px] leading-tight font-bold text-white">Grande Roue</h3>
              <p className="text-[11px] leading-snug text-slate-400 mt-1 tabular-nums">
                {state.wheelQuota.remaining}/{state.wheelQuota.maxAttempts} tours ·{' '}
                {shortCountdown(state.wheelQuota.nextRenewalAt, now)}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('slots')}
          className={`relative overflow-hidden text-left rounded-2xl vc-card-relief hover:-translate-y-0.5 active:translate-y-0.5 hover:border-amber-300/85 ${padCard} transition-all cursor-pointer group flex flex-col justify-between min-h-[126px]`}
        >
          <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/30 to-fuchsia-600/15 border border-violet-300/40 vc-icon-medallion flex items-center justify-center">
                <PlaySquare className="w-4 h-4 text-violet-300 drop-shadow-[0_2px_6px_rgba(167,139,250,0.5)]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="font-display text-[15px] leading-tight font-bold text-white">Bandit Manchot</h3>
              <p className="text-[11px] leading-snug text-slate-400 mt-1 tabular-nums">
                {state.slotQuota.remaining}/{state.slotQuota.maxAttempts} tours ·{' '}
                {shortCountdown(state.slotQuota.nextRenewalAt, now)}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('lottery')}
          className={`relative overflow-hidden text-left rounded-2xl vc-card-relief hover:-translate-y-0.5 active:translate-y-0.5 hover:border-amber-300/85 ${padCard} transition-all cursor-pointer group flex flex-col justify-between min-h-[126px]`}
        >
          <div className="absolute inset-0 vc-gloss-overlay pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/30 to-teal-600/15 border border-emerald-300/40 vc-icon-medallion flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-emerald-300 drop-shadow-[0_2px_6px_rgba(52,211,153,0.5)]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="font-display text-[15px] leading-tight font-bold text-white">
                Loterie {String(config.lottery.drawHour).padStart(2, '0')}h
                {String(config.lottery.drawMinute).padStart(2, '0')}
              </h3>
              <p className="text-[11px] leading-snug text-slate-400 mt-1 tabular-nums">
                {currentDraw?.status === 'DRAWN'
                  ? `Tirage prêt · Rejouer`
                  : currentDraw?.playerNumbers
                    ? `Grille validée (${currentDraw.drawKey})`
                    : currentDraw
                      ? `Dans ${shortCountdown(currentDraw.scheduledAt, now)}`
                      : 'Tirage quotidien'}
              </p>
            </div>
          </div>
        </button>
      </section>

      <button
        type="button"
        onClick={() => onNavigate('history')}
        className="w-full rounded-2xl vc-card-relief hover:-translate-y-0.5 active:translate-y-0.5 hover:border-amber-300/85 p-3.5 flex items-center justify-between gap-2 cursor-pointer transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/8 border border-amber-400/30 vc-icon-medallion flex items-center justify-center">
            <History className="w-5 h-5 text-slate-200" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm text-white">Historique complet de {config.general.playerName}</div>
            <div className="text-xs text-slate-400 tabular-nums">
              {state.history.filter((h) => h.category !== 'admin' && h.category !== 'stopwatch').length} événement(s) enregistré(s)
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-sky-300 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>Consulter</span>
        </div>
      </button>

      {notifPerm === 'default' && !notifDismissed && (
        <div className="rounded-2xl vc-card-relief p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 vc-icon-medallion flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white">Alertes de renouvellement</div>
              <p className="text-xs text-slate-400">
                Recevoir une notification dès qu&apos;un jeu épuisé (0) redevient disponible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const next = await requestRenewalNotificationPermission();
                setNotifPerm(next);
              }}
              className="px-4 py-2 min-h-[44px] rounded-xl vc-btn-gold font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              Activer
            </button>
            <button
              type="button"
              onClick={() => setNotifDismissed(true)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-white/8 hover:bg-white/15 text-xs text-slate-300 cursor-pointer whitespace-nowrap"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
