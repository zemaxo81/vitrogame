import {
  ActivityQuotaState,
  AppState,
  RenewalMode,
  TicketBatchState,
  TicketDefinition,
  TicketInstance,
} from '../types/vitrocash';
import { generateUid, rollWeighted, secureRandom, shuffleArray } from './rng';

/**
 * Reconciles a quota state against current timestamp without ever accumulating unused attempts
 * and without ever performing double renewals.
 */
export function reconcileQuota(
  quota: ActivityQuotaState,
  configMaxAttempts: number,
  configIntervalHours: number,
  configRenewalMode: RenewalMode,
  now = Date.now(),
): { quota: ActivityQuotaState; renewed: boolean } {
  const intervalMs = Math.max(1, configIntervalHours) * 3600_000;
  let updated: ActivityQuotaState = {
    ...quota,
    maxAttempts: configMaxAttempts,
    intervalHours: configIntervalHours,
    renewalMode: configRenewalMode,
  };

  if (configRenewalMode === 'FIXED_INTERVAL') {
    const anchor = updated.periodStartedAt || now;
    const elapsed = Math.max(0, now - anchor);
    const completedCycles = Math.floor(elapsed / intervalMs);
    if (completedCycles >= 1) {
      const latestPeriodStart = anchor + completedCycles * intervalMs;
      updated = {
        ...updated,
        remaining: configMaxAttempts,
        periodStartedAt: latestPeriodStart,
        cooldownStartedAt: null,
        nextRenewalAt: latestPeriodStart + intervalMs,
        lastRenewalId: generateUid('ren-fix'),
      };
      return { quota: updated, renewed: true };
    }
    updated.nextRenewalAt = anchor + intervalMs;
    return { quota: updated, renewed: false };
  }

  // AFTER_CONSUMPTION mode: countdown starts only once remaining hits 0
  if (updated.remaining <= 0) {
    const cooldownStart = updated.cooldownStartedAt ?? now;
    const targetAt = cooldownStart + intervalMs;
    if (now >= targetAt) {
      updated = {
        ...updated,
        remaining: configMaxAttempts,
        periodStartedAt: now,
        cooldownStartedAt: null,
        nextRenewalAt: null,
        lastRenewalId: generateUid('ren-con'),
      };
      return { quota: updated, renewed: true };
    }
    updated = {
      ...updated,
      cooldownStartedAt: cooldownStart,
      nextRenewalAt: targetAt,
    };
    return { quota: updated, renewed: false };
  }

  updated.nextRenewalAt = null;
  updated.cooldownStartedAt = null;
  return { quota: updated, renewed: false };
}

export function consumeQuotaAttempt(quota: ActivityQuotaState, now = Date.now()): ActivityQuotaState {
  if (quota.remaining <= 0) return quota;
  const nextRemaining = quota.remaining - 1;
  const intervalMs = Math.max(1, quota.intervalHours) * 3600_000;

  if (quota.renewalMode === 'AFTER_CONSUMPTION') {
    if (nextRemaining === 0) {
      return {
        ...quota,
        remaining: 0,
        cooldownStartedAt: now,
        nextRenewalAt: now + intervalMs,
      };
    }
    return {
      ...quota,
      remaining: nextRemaining,
    };
  }

  // FIXED_INTERVAL
  return {
    ...quota,
    remaining: nextRemaining,
    nextRenewalAt: quota.periodStartedAt + intervalMs,
  };
}

/**
 * Generates a fresh batch of N distinct active tickets with pre-computed independent rewards.
 */
export function generateDistinctTicketBatch(
  catalog: TicketDefinition[],
  batchSize: number,
  now = Date.now(),
  randFn: () => number = secureRandom,
): TicketBatchState {
  const activeTickets = catalog.filter((t) => t.status === 'active');
  const pool = activeTickets.length > 0 ? activeTickets : catalog.filter((t) => t.status !== 'archived');
  const shuffled = shuffleArray(pool, randFn);
  const count = Math.min(batchSize, shuffled.length);
  const chosen = shuffled.slice(0, count);
  const batchId = generateUid('batch');

  const items: TicketInstance[] = chosen.map((ticket) => {
    const tier = rollWeighted(ticket.probabilities, randFn);
    return {
      instanceId: generateUid('tki'),
      ticketId: ticket.id,
      ticketName: ticket.name,
      batchId,
      status: 'READY',
      rewardAmount: tier.amount,
      rewardTierLabel: tier.label ?? `${tier.amount.toFixed(2).replace('.', ',')} €`,
      createdAt: now,
    };
  });

  return {
    batchId,
    generatedAt: now,
    items,
  };
}

export type RenewedGameKey = 'tickets' | 'wheel' | 'slots';

export interface RenewedGameInfo {
  key: RenewedGameKey;
  label: string;
  renewalId: string;
  attemptsRestored: number;
}

/**
 * Reconciles all 3 interval quotas (tickets, wheel, slots), ensures active ticket batch
 * exists when ticket quota has renewed or hasn't been initialized yet, and reports which
 * games just transitioned from 0 remaining attempts back to renewed availability.
 */
export function reconcileAllQuotasWithRenewals(
  state: AppState,
  now = Date.now(),
): { nextState: AppState; renewedFromZero: RenewedGameInfo[] } {
  const ticketRes = reconcileQuota(
    state.ticketQuota,
    state.config.tickets.batchSize,
    state.config.tickets.intervalHours,
    state.config.tickets.renewalMode,
    now,
  );
  const wheelRes = reconcileQuota(
    state.wheelQuota,
    state.config.wheel.maxSpins,
    state.config.wheel.intervalHours,
    state.config.wheel.renewalMode,
    now,
  );
  const slotRes = reconcileQuota(
    state.slotQuota,
    state.config.slots.maxSpins,
    state.config.slots.intervalHours,
    state.config.slots.renewalMode,
    now,
  );

  let nextBatch = state.activeTicketBatch;
  let nextTicketQuota = ticketRes.quota;

  const needsInitialBatch = nextBatch === null && nextTicketQuota.remaining > 0;
  if (ticketRes.renewed || needsInitialBatch) {
    nextBatch = generateDistinctTicketBatch(state.ticketsCatalog, nextTicketQuota.maxAttempts, now);
    nextTicketQuota = {
      ...nextTicketQuota,
      remaining: nextBatch.items.length,
    };
  }

  const renewedFromZero: RenewedGameInfo[] = [];

  if (
    ticketRes.renewed &&
    state.ticketQuota.remaining === 0 &&
    nextTicketQuota.remaining > 0 &&
    nextTicketQuota.lastRenewalId
  ) {
    renewedFromZero.push({
      key: 'tickets',
      label: 'Tickets à Gratter',
      renewalId: nextTicketQuota.lastRenewalId,
      attemptsRestored: nextTicketQuota.remaining,
    });
  }

  if (
    wheelRes.renewed &&
    state.wheelQuota.remaining === 0 &&
    wheelRes.quota.remaining > 0 &&
    wheelRes.quota.lastRenewalId
  ) {
    renewedFromZero.push({
      key: 'wheel',
      label: 'Grande Roue',
      renewalId: wheelRes.quota.lastRenewalId,
      attemptsRestored: wheelRes.quota.remaining,
    });
  }

  if (
    slotRes.renewed &&
    state.slotQuota.remaining === 0 &&
    slotRes.quota.remaining > 0 &&
    slotRes.quota.lastRenewalId
  ) {
    renewedFromZero.push({
      key: 'slots',
      label: 'Bandit Manchot',
      renewalId: slotRes.quota.lastRenewalId,
      attemptsRestored: slotRes.quota.remaining,
    });
  }

  return {
    nextState: {
      ...state,
      ticketQuota: nextTicketQuota,
      activeTicketBatch: nextBatch,
      wheelQuota: wheelRes.quota,
      slotQuota: slotRes.quota,
    },
    renewedFromZero,
  };
}

/**
 * Reconciles all 3 interval quotas (tickets, wheel, slots) and ensures active ticket batch
 * exists when ticket quota has renewed or hasn't been initialized yet.
 */
export function reconcileAllQuotas(state: AppState, now = Date.now()): AppState {
  return reconcileAllQuotasWithRenewals(state, now).nextState;
}
