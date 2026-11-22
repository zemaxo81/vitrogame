import {
  AdminAuditEvent,
  AppState,
  HistoryCategory,
  HistoryEvent,
  MilestoneRequest,
} from '../types/vitrocash';
import { formatCents, formatEuro, generateUid, toCents } from './rng';

export interface CreditPayload {
  eventId: string;
  category: HistoryCategory;
  title: string;
  description: string;
  amount: number;
  timestamp?: number;
  details?: Record<string, unknown>;
  ticketId?: string;
  ticketName?: string;
}

/**
 * Atomically credits a reward once (idempotent by eventId), updates cycle & cumulative balances,
 * appends chronological history, and triggers a milestone validation request if threshold is reached.
 */
export function creditRewardOnce(state: AppState, payload: CreditPayload): {
  nextState: AppState;
  credited: boolean;
  milestoneTriggered: MilestoneRequest | null;
} {
  if (state.creditedEventIds.includes(payload.eventId)) {
    return { nextState: state, credited: false, milestoneTriggered: null };
  }

  const now = payload.timestamp ?? Date.now();
  const amountCents = Math.max(0, toCents(payload.amount));
  const nextCycleCents = state.cycleBalanceCents + amountCents;
  const nextCumulativeCents = state.cumulativeTotalCents + amountCents;

  const historyEntry: HistoryEvent = {
    id: payload.eventId,
    category: payload.category,
    title: payload.title,
    description: payload.description,
    amount: amountCents / 100,
    timestamp: now,
    details: payload.details ?? {},
    ticketId: payload.ticketId,
    ticketName: payload.ticketName,
    isPositiveOutcome: amountCents > 0,
  };

  let nextMilestones = state.milestones;
  let milestoneTriggered: MilestoneRequest | null = null;
  const thresholdCents = toCents(state.config.milestones.thresholdAmount);
  const hasPendingMilestone = state.milestones.some((m) => m.status === 'PENDING');

  if (thresholdCents > 0 && nextCycleCents >= thresholdCents && !hasPendingMilestone) {
    milestoneTriggered = {
      id: generateUid('ms'),
      thresholdAmount: state.config.milestones.thresholdAmount,
      cycleBalanceAtTrigger: nextCycleCents / 100,
      status: 'PENDING',
      createdAt: now,
      message: state.config.milestones.pendingMessage,
    };
    nextMilestones = [milestoneTriggered, ...state.milestones];
  }

  const nextState: AppState = {
    ...state,
    cycleBalanceCents: nextCycleCents,
    cumulativeTotalCents: nextCumulativeCents,
    creditedEventIds: [...state.creditedEventIds, payload.eventId],
    milestones: nextMilestones,
    history: [historyEntry, ...state.history],
  };

  return {
    nextState,
    credited: true,
    milestoneTriggered,
  };
}

export function validateMilestoneRequest(
  state: AppState,
  milestoneId: string,
  note?: string,
  now = Date.now(),
): AppState {
  const target = state.milestones.find((m) => m.id === milestoneId && m.status === 'PENDING');
  if (!target) return state;

  const nextMilestones = state.milestones.map((m) =>
    m.id === milestoneId
      ? {
          ...m,
          status: 'VALIDATED' as const,
          validatedAt: now,
          note: note?.trim() || undefined,
        }
      : m,
  );

  const resetCycle = state.config.milestones.resetCycleOnValidation;
  const previousBalanceCents = state.cycleBalanceCents;
  const nextCycleCents = resetCycle ? 0 : state.cycleBalanceCents;

  const historyEntry: HistoryEvent = {
    id: generateUid('hist-ms'),
    category: 'milestone',
    title: `Palier de ${formatEuro(target.thresholdAmount)} validé par Jean`,
    description: state.config.milestones.validatedMessage,
    amount: 0,
    timestamp: now,
    details: {
      milestoneId: target.id,
      cycleBalanceBeforeReset: formatCents(previousBalanceCents),
      cycleReset: resetCycle,
      cumulativePreserved: formatCents(state.cumulativeTotalCents),
      note: note ?? '',
    },
    isPositiveOutcome: true,
  };

  const auditEntry: AdminAuditEvent = {
    id: generateUid('aud'),
    action: 'MILESTONE_VALIDATED',
    section: 'Paliers',
    summary: `Validation du palier ${formatEuro(target.thresholdAmount)} (solde cycle ${formatCents(previousBalanceCents)} → ${formatCents(nextCycleCents)})`,
    timestamp: now,
    details: { milestoneId: target.id, previousBalanceCents, nextCycleCents },
  };

  return {
    ...state,
    cycleBalanceCents: nextCycleCents,
    milestones: nextMilestones,
    history: [historyEntry, ...state.history],
    adminAudit: [auditEntry, ...state.adminAudit],
  };
}

export function appendAdminAudit(
  state: AppState,
  action: string,
  section: string,
  summary: string,
  details?: Record<string, unknown>,
  now = Date.now(),
): AppState {
  const auditEntry: AdminAuditEvent = {
    id: generateUid('aud'),
    action,
    section,
    summary,
    timestamp: now,
    details,
  };
  return {
    ...state,
    adminAudit: [auditEntry, ...state.adminAudit],
  };
}
