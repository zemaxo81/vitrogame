import { AppState, StopwatchConfig } from '../types/vitrocash';
import { creditRewardOnce } from './rewards';
import { formatEuro } from './rng';

/**
 * Returns the next threshold in minutes strictly above currentMinutes.
 */
export function getNextStopwatchThreshold(
  currentTotalMinutes: number,
  awardedThresholds: number[],
  config: StopwatchConfig,
): number {
  const sortedInitial = [...config.initialThresholdsMinutes]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  for (const t of sortedInitial) {
    if (!awardedThresholds.includes(t) && t > currentTotalMinutes) {
      return t;
    }
    if (!awardedThresholds.includes(t)) {
      return t;
    }
  }

  const lastInitial = sortedInitial.length > 0 ? sortedInitial[sortedInitial.length - 1] : 0;
  const step = Math.max(1, config.repeatIntervalMinutes);
  let candidate = lastInitial + step;
  while (awardedThresholds.includes(candidate)) {
    candidate += step;
  }
  return candidate;
}

/**
 * Generates all thresholds up to maxMinutes for checking newly crossed milestones.
 */
export function getThresholdsUpTo(maxMinutes: number, config: StopwatchConfig): number[] {
  const sortedInitial = [...config.initialThresholdsMinutes]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const list = sortedInitial.filter((t) => t <= maxMinutes);
  const lastInitial = sortedInitial.length > 0 ? sortedInitial[sortedInitial.length - 1] : 0;
  const step = Math.max(1, config.repeatIntervalMinutes);

  let next = lastInitial + step;
  let guard = 0;
  while (next <= maxMinutes && guard < 10000) {
    list.push(next);
    next += step;
    guard++;
  }
  return list;
}

/**
 * Advances active stopwatch by deltaSeconds and awards any newly reached thresholds once.
 */
export function advanceStopwatch(
  state: AppState,
  deltaSeconds: number,
  now = Date.now(),
): AppState {
  if (deltaSeconds <= 0) return state;

  const nextTotalSeconds = state.stopwatch.totalActiveSeconds + deltaSeconds;
  const nextSessionSeconds = state.stopwatch.sessionActiveSeconds + deltaSeconds;
  const completedMinutes = Math.floor(nextTotalSeconds / 60);

  let nextState: AppState = {
    ...state,
    stopwatch: {
      ...state.stopwatch,
      totalActiveSeconds: nextTotalSeconds,
      sessionActiveSeconds: nextSessionSeconds,
      lastTickAt: now,
    },
  };

  const reachedThresholds = getThresholdsUpTo(completedMinutes, nextState.config.stopwatch);
  const newThresholds = reachedThresholds.filter(
    (t) => !nextState.stopwatch.awardedThresholds.includes(t),
  );

  for (const thresholdMin of newThresholds) {
    const eventId = `stopwatch-threshold-${thresholdMin}`;
    const reward = nextState.config.stopwatch.rewardPerThreshold;
    const res = creditRewardOnce(nextState, {
      eventId,
      category: 'stopwatch',
      title: `Palier Chronomètre · ${thresholdMin} min`,
      description: `Temps de jeu actif cumulé atteint : ${thresholdMin} minutes (+${formatEuro(reward)}).`,
      amount: reward,
      timestamp: now,
      details: {
        thresholdMinutes: thresholdMin,
        totalActiveSeconds: nextTotalSeconds,
      },
    });
    nextState = res.nextState;
    nextState = {
      ...nextState,
      stopwatch: {
        ...nextState.stopwatch,
        awardedThresholds: [...nextState.stopwatch.awardedThresholds, thresholdMin],
      },
    };
  }

  return nextState;
}

export function formatDurationHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
