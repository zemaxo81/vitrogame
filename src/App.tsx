import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  Home,
  PlaySquare,
  RotateCw,
  Shield,
  Ticket,
  WifiOff,
  X,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminPanel } from './components/AdminPanel';
import { LotteryGame } from './components/LotteryGame';
import { PlayerHistory } from './components/PlayerHistory';
import { PlayerHome, PlayerTab } from './components/PlayerHome';
import { ScratchTicketsGame } from './components/ScratchTicketsGame';
import { SlotMachineGame } from './components/SlotMachineGame';
import { SplashScreen } from './components/SplashScreen';
import { VitrocashLogo3D } from './components/VitrocashLogo3D';
import { WheelGame } from './components/WheelGame';
import { createInitialAppState } from './data/defaults';
import { getUpcomingDrawInfo, reconcileLotteryDraws, resolveDraw } from './engine/lottery';
import {
  consumeQuotaAttempt,
  reconcileAllQuotas,
  reconcileAllQuotasWithRenewals,
  RenewedGameInfo,
} from './engine/quotas';
import { appendAdminAudit, creditRewardOnce, validateMilestoneRequest } from './engine/rewards';
import { formatEuro, generateUid } from './engine/rng';
import { advanceStopwatch } from './engine/stopwatch';
import { useOnlineStatus } from './hooks/usePWA';
import {
  buildRenewalNotificationCopy,
  sendSystemRenewalNotification,
} from './notifications/renewalNotifier';
import {
  executeTotalTestDataReset,
  loadPersistedState,
  restoreDefaultParametersOnly,
  savePersistedState,
  savePersistedStateSync,
} from './storage/localDb';
import {
  ActivityKey,
  AppConfig,
  AppState,
  SlotOutcomeTier,
  SlotSymbol,
  TicketDefinition,
  TicketStatus,
  WheelSegment,
} from './types/vitrocash';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'player' | 'admin'>('player');
  const [activeTab, setActiveTab] = useState<PlayerTab>('home');
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [manualStopwatchPaused, setManualStopwatchPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [renewalAlerts, setRenewalAlerts] = useState<RenewedGameInfo[]>([]);

  const isOnline = useOnlineStatus();
  const lastActivityRef = useRef<number>(Date.now());
  const stateRef = useRef<AppState | null>(null);
  const notifiedRenewalIdsRef = useRef<Set<string>>(new Set());
  const hydratedPendingRenewalsRef = useRef<RenewedGameInfo[]>([]);
  const prevQuotasRef = useRef<{
    tickets: { remaining: number; lastRenewalId?: string };
    wheel: { remaining: number; lastRenewalId?: string };
    slots: { remaining: number; lastRenewalId?: string };
  } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initial local hydration + reconciliation
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await loadPersistedState();
      const baseTime = Date.now();
      const baseState = loaded ?? createInitialAppState(baseTime, '');
      const { nextState: qReconciled, renewedFromZero } = reconcileAllQuotasWithRenewals(
        baseState,
        baseTime,
      );
      const initial = reconcileLotteryDraws(qReconciled, baseTime);
      if (!mounted) return;
      prevQuotasRef.current = {
        tickets: {
          remaining: initial.ticketQuota.remaining,
          lastRenewalId: initial.ticketQuota.lastRenewalId,
        },
        wheel: {
          remaining: initial.wheelQuota.remaining,
          lastRenewalId: initial.wheelQuota.lastRenewalId,
        },
        slots: {
          remaining: initial.slotQuota.remaining,
          lastRenewalId: initial.slotQuota.lastRenewalId,
        },
      };
      if (loaded && renewedFromZero.length > 0) {
        hydratedPendingRenewalsRef.current = renewedFromZero;
      }
      setState(initial);
      if (!initial.config.splash.enabled) {
        setShowSplash(false);
      }
      await savePersistedState(initial);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    void savePersistedState(state);
  }, [state]);

  useEffect(() => {
    const flush = () => {
      if (stateRef.current) {
        savePersistedStateSync(stateRef.current);
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      } else if (document.visibilityState === 'visible') {
        const resumeNow = Date.now();
        setNow(resumeNow);
        setState((prev) => {
          if (!prev) return prev;
          return reconcileLotteryDraws(reconcileAllQuotas(prev, resumeNow), resumeNow);
        });
      }
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const triggerRenewalNotifications = useCallback(
    (items: RenewedGameInfo[], soundsCfg?: AppState['config']['sounds']) => {
      const fresh = items.filter(
        (item) => item.renewalId && !notifiedRenewalIdsRef.current.has(item.renewalId),
      );
      if (fresh.length === 0) return;
      fresh.forEach((item) => notifiedRenewalIdsRef.current.add(item.renewalId));
      setRenewalAlerts((prev) => {
        const byKey = new Map(prev.map((x) => [x.key, x]));
        for (const f of fresh) byKey.set(f.key, f);
        return Array.from(byKey.values());
      });
      void sendSystemRenewalNotification(fresh);
      if (soundsCfg) {
        soundEngine.playWin(soundsCfg, false);
      }
    },
    [],
  );

  // Detect real 0 -> renewed quota transitions & flush any offline catchup alerts after splash
  useEffect(() => {
    if (!state) return;

    if (!showSplash && hydratedPendingRenewalsRef.current.length > 0) {
      const queued = hydratedPendingRenewalsRef.current;
      hydratedPendingRenewalsRef.current = [];
      triggerRenewalNotifications(queued, state.config.sounds);
    }

    const cur = {
      tickets: {
        remaining: state.ticketQuota.remaining,
        lastRenewalId: state.ticketQuota.lastRenewalId,
      },
      wheel: {
        remaining: state.wheelQuota.remaining,
        lastRenewalId: state.wheelQuota.lastRenewalId,
      },
      slots: {
        remaining: state.slotQuota.remaining,
        lastRenewalId: state.slotQuota.lastRenewalId,
      },
    };

    const prev = prevQuotasRef.current;
    prevQuotasRef.current = cur;
    if (!prev) return;

    const detected: RenewedGameInfo[] = [];
    if (
      prev.tickets.remaining === 0 &&
      cur.tickets.remaining > 0 &&
      cur.tickets.lastRenewalId?.startsWith('ren-') &&
      cur.tickets.lastRenewalId !== prev.tickets.lastRenewalId
    ) {
      detected.push({
        key: 'tickets',
        label: 'Tickets à Gratter',
        renewalId: cur.tickets.lastRenewalId,
        attemptsRestored: cur.tickets.remaining,
      });
    }
    if (
      prev.wheel.remaining === 0 &&
      cur.wheel.remaining > 0 &&
      cur.wheel.lastRenewalId?.startsWith('ren-') &&
      cur.wheel.lastRenewalId !== prev.wheel.lastRenewalId
    ) {
      detected.push({
        key: 'wheel',
        label: 'Grande Roue',
        renewalId: cur.wheel.lastRenewalId,
        attemptsRestored: cur.wheel.remaining,
      });
    }
    if (
      prev.slots.remaining === 0 &&
      cur.slots.remaining > 0 &&
      cur.slots.lastRenewalId?.startsWith('ren-') &&
      cur.slots.lastRenewalId !== prev.slots.lastRenewalId
    ) {
      detected.push({
        key: 'slots',
        label: 'Bandit Manchot',
        renewalId: cur.slots.lastRenewalId,
        attemptsRestored: cur.slots.remaining,
      });
    }

    if (detected.length > 0) {
      if (showSplash) {
        hydratedPendingRenewalsRef.current.push(...detected);
      } else {
        triggerRenewalNotifications(detected, state.config.sounds);
      }
    }
  }, [
    state,
    showSplash,
    triggerRenewalNotifications,
  ]);

  useEffect(() => {
    const bump = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', bump, { passive: true });
    window.addEventListener('pointermove', bump, { passive: true });
    window.addEventListener('keydown', bump, { passive: true });
    window.addEventListener('touchstart', bump, { passive: true });
    window.addEventListener('touchmove', bump, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('pointermove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
      window.removeEventListener('touchmove', bump);
    };
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // 1-second central heartbeat (inactive while splash is visible)
  useEffect(() => {
    if (!state || showSplash) return;
    const id = window.setInterval(() => {
      const tickNow = Date.now();
      setNow(tickNow);

      setState((prev) => {
        if (!prev) return prev;
        let next = reconcileAllQuotas(prev, tickNow);
        next = reconcileLotteryDraws(next, tickNow);

        const isPlayTab = (['tickets', 'wheel', 'slots', 'lottery'] as string[]).includes(activeTab);
        const isTrackedActivity =
          isPlayTab &&
          next.config.stopwatch.trackedActivities.includes(activeTab as ActivityKey);
        const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
        const isUserActive =
          tickNow - lastActivityRef.current <=
          next.config.stopwatch.autoPauseIdleSeconds * 1000;

        if (
          !showSplash &&
          !showAdminAuth &&
          mode === 'player' &&
          !manualStopwatchPaused &&
          isTrackedActivity &&
          isVisible &&
          isUserActive
        ) {
          next = advanceStopwatch(
            {
              ...next,
              stopwatch: { ...next.stopwatch, isPaused: false, pauseReason: null },
            },
            1,
            tickNow,
          );
        } else {
          const reason = showSplash
            ? 'Chargement'
            : showAdminAuth
              ? 'Authentification'
              : mode === 'admin'
                ? 'Administration'
                : manualStopwatchPaused
                  ? 'Pause manuelle'
                  : !isTrackedActivity
                    ? 'Hors activité'
                    : !isVisible
                      ? 'Arrière-plan'
                      : 'Inactivité';
          if (!next.stopwatch.isPaused || next.stopwatch.pauseReason !== reason) {
            next = {
              ...next,
              stopwatch: {
                ...next.stopwatch,
                isPaused: true,
                pauseReason: reason,
              },
            };
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [Boolean(state), showSplash, showAdminAuth, mode, activeTab, manualStopwatchPaused]);

  const handleStartScratch = useCallback((instanceId: string) => {
    const tNow = Date.now();
    setState((prev) => {
      if (!prev || !prev.activeTicketBatch) return prev;
      const target = prev.activeTicketBatch.items.find((i) => i.instanceId === instanceId);
      if (!target || target.status !== 'READY') return prev;
      const nextItems = prev.activeTicketBatch.items.map((i) =>
        i.instanceId === instanceId ? { ...i, status: 'SCRATCHING' as const } : i,
      );
      return {
        ...prev,
        activeTicketBatch: { ...prev.activeTicketBatch, items: nextItems },
        ticketQuota: consumeQuotaAttempt(prev.ticketQuota, tNow),
      };
    });
  }, []);

  const handleCompleteScratch = useCallback((instanceId: string) => {
    const tNow = Date.now();
    setState((prev) => {
      if (!prev || !prev.activeTicketBatch) return prev;
      const target = prev.activeTicketBatch.items.find((i) => i.instanceId === instanceId);
      if (!target || target.status === 'REVEALED') return prev;

      const eventId = `ticket-${instanceId}`;
      const creditRes = creditRewardOnce(prev, {
        eventId,
        category: 'tickets',
        title: `Ticket · ${target.ticketName}`,
        description:
          target.rewardAmount > 0
            ? `Gain en crédits fictifs : ${formatEuro(target.rewardAmount)}`
            : 'Ticket gratté sans gain (0,00 €)',
        amount: target.rewardAmount,
        timestamp: tNow,
        ticketId: target.ticketId,
        ticketName: target.ticketName,
        details: {
          batchId: target.batchId,
          ticketName: target.ticketName,
          reward: formatEuro(target.rewardAmount),
        },
      });

      const nextItems = creditRes.nextState.activeTicketBatch!.items.map((i) =>
        i.instanceId === instanceId
          ? {
              ...i,
              status: 'REVEALED' as const,
              scratchedAt: tNow,
              creditedEventId: eventId,
            }
          : i,
      );

      const nextQuota =
        target.status === 'READY'
          ? consumeQuotaAttempt(creditRes.nextState.ticketQuota, tNow)
          : creditRes.nextState.ticketQuota;

      return {
        ...creditRes.nextState,
        activeTicketBatch: { ...creditRes.nextState.activeTicketBatch!, items: nextItems },
        ticketQuota: nextQuota,
      };
    });
  }, []);

  const handleWheelResult = useCallback((segment: WheelSegment) => {
    const tNow = Date.now();
    setState((prev) => {
      if (!prev || prev.wheelQuota.remaining <= 0) return prev;
      const eventId = generateUid('wheel');
      const creditRes = creditRewardOnce(prev, {
        eventId,
        category: 'wheel',
        title: `Grande Roue · ${segment.label}`,
        description:
          segment.amount > 0
            ? `Tour de roue gagnant : +${formatEuro(segment.amount)}`
            : 'Tour de roue : 0,00 €',
        amount: segment.amount,
        timestamp: tNow,
        details: { segmentLabel: segment.label, segmentId: segment.id },
      });
      return {
        ...creditRes.nextState,
        wheelQuota: consumeQuotaAttempt(creditRes.nextState.wheelQuota, tNow),
      };
    });
  }, []);

  const handleSlotResult = useCallback(
    (outcome: SlotOutcomeTier, symbols: [SlotSymbol, SlotSymbol, SlotSymbol]) => {
      const tNow = Date.now();
      setState((prev) => {
        if (!prev || prev.slotQuota.remaining <= 0) return prev;
        const eventId = generateUid('slot');
        const comboStr = symbols.map((s) => `${s.glyph} ${s.name}`).join(' · ');
        const creditRes = creditRewardOnce(prev, {
          eventId,
          category: 'slots',
          title: `Bandit Manchot · ${outcome.label}`,
          description: `Combinaison : ${comboStr}`,
          amount: outcome.amount,
          timestamp: tNow,
          details: { symbols: symbols.map((s) => s.name), reward: formatEuro(outcome.amount) },
        });
        return {
          ...creditRes.nextState,
          slotQuota: consumeQuotaAttempt(creditRes.nextState.slotQuota, tNow),
        };
      });
    },
    [],
  );

  const handleSubmitLottery = useCallback(
    (drawKey: string, mainNumbers: number[], complementary: number) => {
      const tNow = Date.now();
      setState((prev) => {
        if (!prev) return prev;
        const draw = prev.lotteryDraws[drawKey];
        if (!draw || draw.status !== 'OPEN' || draw.playerNumbers) return prev;
        return {
          ...prev,
          lotteryDraws: {
            ...prev.lotteryDraws,
            [drawKey]: {
              ...draw,
              playerNumbers: mainNumbers,
              playerComplementary: complementary,
              submittedAt: tNow,
            },
          },
        };
      });
    },
    [],
  );

  const handleReplayLottery = useCallback((drawnKey: string) => {
    const tNow = Date.now();
    setState((prev) => {
      if (!prev) return prev;
      const upcoming = getUpcomingDrawInfo(tNow, prev.config.lottery);
      const nextDraws = { ...prev.lotteryDraws };
      if (nextDraws[drawnKey]) {
        nextDraws[drawnKey] = { ...nextDraws[drawnKey], replayedAfterDraw: true };
      }
      if (!nextDraws[upcoming.drawKey]) {
        nextDraws[upcoming.drawKey] = {
          drawKey: upcoming.drawKey,
          scheduledAt: upcoming.scheduledAt,
          status: 'OPEN',
        };
      }
      return {
        ...prev,
        lotteryDraws: nextDraws,
        currentLotteryKey: upcoming.drawKey,
      };
    });
  }, []);

  const handleUpdateConfig = useCallback(
    (section: keyof AppConfig, value: unknown, auditSummary: string) => {
      setState((prev) => {
        if (!prev) return prev;
        const updated: AppState = {
          ...prev,
          config: {
            ...prev.config,
            [section]: value,
          },
        };
        let reconciled = reconcileAllQuotas(updated, Date.now());
        if (section === 'lottery') {
          reconciled = reconcileLotteryDraws(reconciled, Date.now());
        }
        return appendAdminAudit(reconciled, 'CONFIG_UPDATED', String(section), auditSummary);
      });
    },
    [],
  );

  const handleSaveTicket = useCallback((ticket: TicketDefinition, isNew: boolean) => {
    setState((prev) => {
      if (!prev) return prev;
      const nextCatalog = isNew
        ? [ticket, ...prev.ticketsCatalog]
        : prev.ticketsCatalog.map((t) => (t.id === ticket.id ? ticket : t));
      return appendAdminAudit(
        { ...prev, ticketsCatalog: nextCatalog },
        isNew ? 'TICKET_CREATED' : 'TICKET_UPDATED',
        'Tickets',
        `${isNew ? 'Ajout' : 'Modification'} du ticket ${ticket.name}`,
      );
    });
  }, []);

  const handleDuplicateTicket = useCallback((ticketId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const src = prev.ticketsCatalog.find((t) => t.id === ticketId);
      if (!src) return prev;
      const tNow = Date.now();
      const copy: TicketDefinition = {
        ...JSON.parse(JSON.stringify(src)),
        id: generateUid('tk'),
        name: `${src.name} (Copie)`,
        createdAt: tNow,
        updatedAt: tNow,
        isInitial: false,
      };
      return appendAdminAudit(
        { ...prev, ticketsCatalog: [copy, ...prev.ticketsCatalog] },
        'TICKET_DUPLICATED',
        'Tickets',
        `Duplication du ticket ${src.name}`,
      );
    });
  }, []);

  const handleSetTicketStatus = useCallback((ticketId: string, status: TicketStatus) => {
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.ticketsCatalog.find((t) => t.id === ticketId);
      const nextCatalog = prev.ticketsCatalog.map((t) =>
        t.id === ticketId ? { ...t, status, updatedAt: Date.now() } : t,
      );
      return appendAdminAudit(
        { ...prev, ticketsCatalog: nextCatalog },
        'TICKET_STATUS',
        'Tickets',
        `Statut de ${target?.name ?? ticketId} → ${status}`,
      );
    });
  }, []);

  const handleDeleteTicket = useCallback((ticketId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.ticketsCatalog.find((t) => t.id === ticketId);
      const nextCatalog = prev.ticketsCatalog.filter((t) => t.id !== ticketId);
      return appendAdminAudit(
        { ...prev, ticketsCatalog: nextCatalog },
        'TICKET_DELETED',
        'Tickets',
        `Suppression du ticket ${target?.name ?? ticketId} (historique conservé)`,
      );
    });
  }, []);

  const handleForceLotteryDrawNow = useCallback(() => {
    const tNow = Date.now();
    setState((prev) => {
      if (!prev) return prev;
      const key = prev.currentLotteryKey;
      const draw = prev.lotteryDraws[key];
      if (!draw || draw.status === 'DRAWN') return prev;
      const resolved = resolveDraw(draw, prev.config.lottery, tNow);
      let nextState: AppState = {
        ...prev,
        lotteryDraws: { ...prev.lotteryDraws, [key]: resolved },
      };
      if (resolved.playerNumbers && typeof resolved.playerComplementary === 'number') {
        const eventId = `lottery-draw-${key}`;
        const creditRes = creditRewardOnce(nextState, {
          eventId,
          category: 'lottery',
          title: `Tirage Loterie du ${key}`,
          description: `${resolved.matchedMain?.length ?? 0} numéro(s)${resolved.matchedComplementary ? ' + Complémentaire' : ''} — Gain : ${formatEuro(resolved.totalPrize ?? 0)}`,
          amount: resolved.totalPrize ?? 0,
          timestamp: tNow,
          details: {
            drawKey: key,
            winningNumbers: resolved.winningNumbers,
            winningComplementary: resolved.winningComplementary,
          },
        });
        nextState = creditRes.nextState;
        nextState.lotteryDraws[key] = { ...resolved, creditedEventId: eventId };
      }
      return appendAdminAudit(nextState, 'LOTTERY_MANUAL_DRAW', 'Loterie', `Tirage manuel ${key}`);
    });
  }, []);

  if (!state) {
    return <div className="min-h-screen bg-black" />;
  }

  const activeDraw =
    state.lotteryDraws[state.currentLotteryKey] ?? {
      drawKey: state.currentLotteryKey || 'En cours',
      scheduledAt: now + 3600_000,
      status: 'OPEN' as const,
    };

  const navItems: Array<{ id: PlayerTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Accueil', icon: <Home className="w-5 h-5" /> },
    { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-5 h-5" /> },
    { id: 'wheel', label: 'Roue', icon: <RotateCw className="w-5 h-5" /> },
    { id: 'slots', label: 'Slots', icon: <PlaySquare className="w-5 h-5" /> },
    { id: 'lottery', label: 'Loterie', icon: <CalendarClock className="w-5 h-5" /> },
  ];

  const glowMult =
    state.config.appearance.glowIntensity === 'high'
      ? 1.35
      : state.config.appearance.glowIntensity === 'low'
        ? 0.45
        : 1;

  return (
    <div className="min-h-[100dvh] bg-[#04010A] text-slate-100 relative overflow-x-hidden flex justify-center">
      {/* Outer desktop ambient vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          opacity: glowMult > 1 ? 1 : glowMult,
          background:
            'radial-gradient(50% 45% at 50% 0%, rgba(109, 40, 217, 0.22) 0%, transparent 72%), radial-gradient(45% 45% at 50% 100%, rgba(245, 158, 11, 0.10) 0%, transparent 72%)',
        }}
      />

      {showSplash && (
        <SplashScreen
          config={state.config.splash}
          appName={state.config.general.appName}
          onComplete={handleSplashComplete}
        />
      )}

      {/* Vertical Android Smartphone Viewport Frame */}
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-[#090414] flex flex-col relative z-10 sm:border-x sm:border-amber-400/35 sm:shadow-[0_0_80px_rgba(0,0,0,0.95),0_0_44px_-12px_rgba(245,158,11,0.22)]">
        {/* Inner ambient cosmic violet & gold lighting */}
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            opacity: glowMult > 1 ? 1 : glowMult,
            background:
              'radial-gradient(75% 42% at 20% 0%, rgba(109, 40, 217, 0.24) 0%, transparent 70%), radial-gradient(65% 42% at 88% 14%, rgba(56, 189, 248, 0.16) 0%, transparent 70%), radial-gradient(70% 35% at 50% 100%, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
          }}
        />

        {!isOnline && !showSplash && (
          <div className="relative z-20 bg-amber-500/15 border-b border-amber-400/30 px-3 py-1.5 text-center text-[11px] text-amber-200 flex items-center justify-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Hors connexion · Sauvegarde locale active</span>
          </div>
        )}

        {mode === 'admin' ? (
          <AdminPanel
            state={state}
            now={now}
            onExitAdmin={() => setMode('player')}
            onUpdateConfig={handleUpdateConfig}
            onSaveTicket={handleSaveTicket}
            onDuplicateTicket={handleDuplicateTicket}
            onSetTicketStatus={handleSetTicketStatus}
            onDeleteTicket={handleDeleteTicket}
            onValidateMilestone={(id, note) =>
              setState((prev) => (prev ? validateMilestoneRequest(prev, id, note) : prev))
            }
            onRejectMilestone={(id, note) =>
              setState((prev) => {
                if (!prev) return prev;
                const next = {
                  ...prev,
                  milestones: prev.milestones.map((m) =>
                    m.id === id ? { ...m, status: 'REJECTED' as const, note } : m,
                  ),
                };
                return appendAdminAudit(next, 'MILESTONE_REJECTED', 'Paliers', `Palier ${id} refusé`);
              })
            }
            onForceLotteryDrawNow={handleForceLotteryDrawNow}
            onRestoreBackup={(restored) =>
              setState(
                appendAdminAudit(
                  reconcileLotteryDraws(reconcileAllQuotas(restored, Date.now()), Date.now()),
                  'BACKUP_RESTORED',
                  'Sauvegardes',
                  'Sauvegarde restaurée avec succès',
                ),
              )
            }
            onRecordBackup={(nextState) => setState(nextState)}
            onTotalTestDataReset={() =>
              setState((prev) => {
                if (!prev) return prev;
                const reset = executeTotalTestDataReset(prev, Date.now());
                return reconcileLotteryDraws(reconcileAllQuotas(reset, Date.now()), Date.now());
              })
            }
            onRestoreDefaultParamsOnly={() =>
              setState((prev) => (prev ? restoreDefaultParametersOnly(prev, Date.now()) : prev))
            }
            onPreviewSplash={() => setShowSplash(true)}
            manualStopwatchPaused={manualStopwatchPaused}
            onToggleStopwatchPause={() => setManualStopwatchPaused((v) => !v)}
          />
        ) : (
          <div className="min-h-[100dvh] flex-1 flex flex-col relative z-10">
            <header className="sticky top-0 z-30 h-14 vc-glass-chrome border-b border-amber-400/30 px-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-[0.98]"
                aria-label={state.config.general.appName}
              >
                <VitrocashLogo3D
                  text={state.config.general.appName}
                  variant="header"
                  glowEnabled={state.config.appearance.glowIntensity !== 'low'}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowAdminAuth(true)}
                aria-label="Accès administration Jean"
                title="Espace Jean"
                className="min-h-[38px] px-3 rounded-xl bg-white/8 hover:bg-white/15 border border-amber-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] text-slate-200 hover:text-amber-300 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 active:translate-y-px"
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>Jean</span>
              </button>
            </header>

            <main className="flex-1 w-full px-3.5 pt-4 pb-6">
              {!showSplash && renewalAlerts.length > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-3.5 rounded-2xl vc-card-hero p-3.5 space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/60 vc-icon-medallion flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-extrabold text-[13px] leading-snug text-amber-200">
                        {buildRenewalNotificationCopy(renewalAlerts).title}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-200 mt-0.5">
                        {buildRenewalNotificationCopy(renewalAlerts).body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRenewalAlerts([])}
                      aria-label="Fermer la notification"
                      className="min-h-[34px] min-w-[34px] rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {renewalAlerts.map((alert) => (
                      <button
                        key={alert.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(alert.key);
                          setRenewalAlerts((prev) => prev.filter((a) => a.key !== alert.key));
                        }}
                        className="px-3 py-1.5 min-h-[38px] rounded-xl vc-btn-gold text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        Ouvrir {alert.key === 'tickets' ? 'Tickets' : alert.key === 'wheel' ? 'Roue' : 'Slots'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'home' && (
                <PlayerHome
                  state={state}
                  now={now}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'tickets' && (
                <ScratchTicketsGame
                  batch={state.activeTicketBatch}
                  quota={state.ticketQuota}
                  catalog={state.ticketsCatalog}
                  sounds={state.config.sounds}
                  animations={state.config.animations}
                  now={now}
                  onStartScratch={handleStartScratch}
                  onCompleteScratch={handleCompleteScratch}
                />
              )}
              {activeTab === 'wheel' && (
                <WheelGame
                  config={state.config.wheel}
                  quota={state.wheelQuota}
                  sounds={state.config.sounds}
                  animations={state.config.animations}
                  now={now}
                  onWheelResult={handleWheelResult}
                />
              )}
              {activeTab === 'slots' && (
                <SlotMachineGame
                  config={state.config.slots}
                  quota={state.slotQuota}
                  sounds={state.config.sounds}
                  animations={state.config.animations}
                  now={now}
                  onSlotResult={handleSlotResult}
                />
              )}
              {activeTab === 'lottery' && (
                <LotteryGame
                  config={state.config.lottery}
                  currentDraw={activeDraw}
                  allDraws={state.lotteryDraws}
                  sounds={state.config.sounds}
                  animations={state.config.animations}
                  now={now}
                  onSubmitCombination={handleSubmitLottery}
                  onReplayNextDraw={handleReplayLottery}
                />
              )}
              {activeTab === 'history' && <PlayerHistory history={state.history} />}
            </main>

            <nav
              className="sticky bottom-0 z-30 w-full vc-glass-chrome border-t border-amber-400/30 pb-safe mt-auto"
              aria-label="Navigation principale"
            >
              <div className="grid grid-cols-5 h-16 items-center">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`h-full relative flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isActive
                          ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-0 w-9 h-0.5 rounded-full bg-gradient-to-r from-amber-300 to-sky-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                      )}
                      {item.icon}
                      <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </div>

      {showAdminAuth && (
        <AdminAuthModal
          securityConfig={state.config.security}
          lockout={state.securityLockout}
          now={now}
          onClose={() => setShowAdminAuth(false)}
          onSuccess={() => {
            setShowAdminAuth(false);
            setState((prev) =>
              prev
                ? { ...prev, securityLockout: { failedAttempts: 0, lockedUntil: null } }
                : prev,
            );
            setMode('admin');
          }}
          onFailedAttempt={() => {
            const tNow = Date.now();
            setState((prev) => {
              if (!prev) return prev;
              const nextFails = prev.securityLockout.failedAttempts + 1;
              const shouldLock = nextFails >= prev.config.security.maxFailedAttempts;
              return {
                ...prev,
                securityLockout: {
                  failedAttempts: shouldLock ? 0 : nextFails,
                  lockedUntil: shouldLock
                    ? tNow + prev.config.security.lockoutSeconds * 1000
                    : null,
                },
              };
            });
          }}
        />
      )}
    </div>
  );
}
