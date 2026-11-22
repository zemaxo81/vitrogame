import { AppState, LotteryConfig, LotteryDraw } from '../types/vitrocash';
import { creditRewardOnce } from './rewards';
import { formatEuro, secureRandom, shuffleArray } from './rng';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(ts: number, timeZone = 'Europe/Paris'): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function formatDrawKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDrawKey(drawKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = drawKey.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function addDaysToDrawKey(drawKey: string, deltaDays: number): string {
  const { year, month, day } = parseDrawKey(drawKey);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return formatDrawKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Resolves the exact UTC epoch ms for (year, month, day, hour, minute) in the target IANA timezone.
 */
export function zonedDateTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = 'Europe/Paris',
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 3; i++) {
    const actual = getZonedParts(guess, timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = wantedAsUtc - actualAsUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return guess;
}

export function getUpcomingDrawInfo(
  now: number,
  config: LotteryConfig,
): { drawKey: string; scheduledAt: number } {
  const p = getZonedParts(now, config.timezone);
  const todayKey = formatDrawKey(p.year, p.month, p.day);
  const todayScheduledAt = zonedDateTimeToUtcMs(
    p.year,
    p.month,
    p.day,
    config.drawHour,
    config.drawMinute,
    config.timezone,
  );
  if (now < todayScheduledAt) {
    return { drawKey: todayKey, scheduledAt: todayScheduledAt };
  }
  const tomorrowKey = addDaysToDrawKey(todayKey, 1);
  const tm = parseDrawKey(tomorrowKey);
  const tomorrowScheduledAt = zonedDateTimeToUtcMs(
    tm.year,
    tm.month,
    tm.day,
    config.drawHour,
    config.drawMinute,
    config.timezone,
  );
  return { drawKey: tomorrowKey, scheduledAt: tomorrowScheduledAt };
}

export function validateLotterySelection(
  mainNumbers: number[],
  complementary: number | null,
  config: LotteryConfig,
): { valid: boolean; error?: string } {
  if (mainNumbers.length !== config.mainPickCount) {
    return {
      valid: false,
      error: `Veuillez sélectionner exactement ${config.mainPickCount} numéros principaux.`,
    };
  }
  const uniqueMain = new Set(mainNumbers);
  if (uniqueMain.size !== config.mainPickCount) {
    return { valid: false, error: 'Les numéros principaux doivent tous être distincts.' };
  }
  for (const n of mainNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > config.maxNumber) {
      return {
        valid: false,
        error: `Chaque numéro principal doit être compris entre 1 et ${config.maxNumber}.`,
      };
    }
  }
  if (
    complementary === null ||
    !Number.isInteger(complementary) ||
    complementary < 1 ||
    complementary > config.maxNumber
  ) {
    return {
      valid: false,
      error: `Veuillez choisir un numéro complémentaire entre 1 et ${config.maxNumber}.`,
    };
  }
  if (uniqueMain.has(complementary)) {
    return {
      valid: false,
      error: 'Le numéro complémentaire doit être différent des 5 numéros principaux.',
    };
  }
  return { valid: true };
}

export function generateWinningCombination(
  config: LotteryConfig,
  randFn: () => number = secureRandom,
): { winningNumbers: number[]; winningComplementary: number } {
  const pool = Array.from({ length: config.maxNumber }, (_, i) => i + 1);
  const shuffled = shuffleArray(pool, randFn);
  const winningNumbers = shuffled.slice(0, config.mainPickCount).sort((a, b) => a - b);
  const winningComplementary = shuffled[config.mainPickCount];
  return { winningNumbers, winningComplementary };
}

export function evaluateLotteryTicket(
  playerNumbers: number[],
  playerComplementary: number,
  winningNumbers: number[],
  winningComplementary: number,
  config: LotteryConfig,
): {
  matchedMain: number[];
  matchedComplementary: boolean;
  mainPrize: number;
  bonusPrize: number;
  totalPrize: number;
} {
  const winSet = new Set(winningNumbers);
  const matchedMain = playerNumbers.filter((n) => winSet.has(n)).sort((a, b) => a - b);
  const matchedComplementary = playerComplementary === winningComplementary;
  const mainPrize = config.prizeScale[matchedMain.length] ?? 0;
  const bonusPrize = matchedComplementary ? config.complementaryBonus : 0;
  const totalPrize = Math.round((mainPrize + bonusPrize) * 100) / 100;
  return {
    matchedMain,
    matchedComplementary,
    mainPrize,
    bonusPrize,
    totalPrize,
  };
}

export function resolveDraw(
  draw: LotteryDraw,
  config: LotteryConfig,
  now: number,
  randFn: () => number = secureRandom,
): LotteryDraw {
  if (draw.status === 'DRAWN') return draw;

  const { winningNumbers, winningComplementary } = generateWinningCombination(config, randFn);
  const hasEntry =
    Array.isArray(draw.playerNumbers) &&
    draw.playerNumbers.length === config.mainPickCount &&
    typeof draw.playerComplementary === 'number';

  if (!hasEntry) {
    return {
      ...draw,
      status: 'DRAWN',
      winningNumbers,
      winningComplementary,
      matchedMain: [],
      matchedComplementary: false,
      mainPrize: 0,
      bonusPrize: 0,
      totalPrize: 0,
      drawnAt: now,
    };
  }

  const evalResult = evaluateLotteryTicket(
    draw.playerNumbers!,
    draw.playerComplementary!,
    winningNumbers,
    winningComplementary,
    config,
  );

  return {
    ...draw,
    status: 'DRAWN',
    winningNumbers,
    winningComplementary,
    ...evalResult,
    drawnAt: now,
  };
}

/**
 * Reconciles any past-due OPEN draws (e.g. missed 20:00 Europe/Paris draw while app was closed),
 * ensures an OPEN draw exists for the next upcoming 20:00 slot, and credits any winning tickets once.
 */
export function reconcileLotteryDraws(state: AppState, now = Date.now()): AppState {
  const cfg = state.config.lottery;
  const upcoming = getUpcomingDrawInfo(now, cfg);
  let nextState = { ...state, lotteryDraws: { ...state.lotteryDraws } };

  // 1. Resolve any existing OPEN draws whose scheduledAt <= now
  const openPastKeys = Object.keys(nextState.lotteryDraws)
    .filter((key) => {
      const d = nextState.lotteryDraws[key];
      return d.status === 'OPEN' && now >= d.scheduledAt;
    })
    .sort();

  let lastResolvedWithEntryKey: string | null = null;

  for (const key of openPastKeys) {
    const resolved = resolveDraw(nextState.lotteryDraws[key], cfg, now);
    const eventId = `lottery-draw-${key}`;
    if (
      resolved.playerNumbers &&
      typeof resolved.playerComplementary === 'number' &&
      !resolved.creditedEventId
    ) {
      const total = resolved.totalPrize ?? 0;
      const creditRes = creditRewardOnce(nextState, {
        eventId,
        category: 'lottery',
        title: `Tirage Loterie du ${key}`,
        description: `${resolved.matchedMain?.length ?? 0} numéro(s) principal(aux)${resolved.matchedComplementary ? ' + Complémentaire' : ''} — Gain : ${formatEuro(total)}`,
        amount: total,
        timestamp: now,
        details: {
          drawKey: key,
          playerNumbers: resolved.playerNumbers,
          playerComplementary: resolved.playerComplementary,
          winningNumbers: resolved.winningNumbers,
          winningComplementary: resolved.winningComplementary,
          matchedMain: resolved.matchedMain,
          matchedComplementary: resolved.matchedComplementary,
          mainPrize: resolved.mainPrize,
          bonusPrize: resolved.bonusPrize,
          totalPrize: total,
        },
      });
      nextState = creditRes.nextState;
      resolved.creditedEventId = eventId;
      lastResolvedWithEntryKey = key;
    }
    nextState.lotteryDraws[key] = resolved;
  }

  // 2. Ensure upcoming draw exists
  if (!nextState.lotteryDraws[upcoming.drawKey]) {
    nextState.lotteryDraws[upcoming.drawKey] = {
      drawKey: upcoming.drawKey,
      scheduledAt: upcoming.scheduledAt,
      status: 'OPEN',
    };
  }

  // 3. Determine currentLotteryKey to display:
  // If user just had a draw resolved and hasn't pressed REJOUER yet, keep showing that drawn result!
  const current = nextState.currentLotteryKey
    ? nextState.lotteryDraws[nextState.currentLotteryKey]
    : undefined;

  if (lastResolvedWithEntryKey) {
    nextState.currentLotteryKey = lastResolvedWithEntryKey;
  } else if (current && current.status === 'DRAWN' && current.playerNumbers && !current.replayedAfterDraw) {
    // Keep displaying the latest drawn ticket with REJOUER button until Erika taps REJOUER
    nextState.currentLotteryKey = current.drawKey;
  } else {
    nextState.currentLotteryKey = upcoming.drawKey;
  }

  return nextState;
}

export function isLotteryCutoffClosed(draw: LotteryDraw, config: LotteryConfig, now = Date.now()): boolean {
  if (draw.status !== 'OPEN') return true;
  const cutoffMs = Math.max(0, config.cutoffMinutesBeforeDraw) * 60_000;
  return now >= draw.scheduledAt - cutoffMs;
}
