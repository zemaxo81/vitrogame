import assert from 'node:assert/strict';
import { createInitialAppState, DEFAULT_TICKET_PROBABILITIES } from '../src/data/defaults';
import {
  evaluateLotteryTicket,
  getUpcomingDrawInfo,
  reconcileLotteryDraws,
  validateLotterySelection,
  zonedDateTimeToUtcMs,
} from '../src/engine/lottery';
import {
  consumeQuotaAttempt,
  generateDistinctTicketBatch,
  reconcileAllQuotasWithRenewals,
  reconcileQuota,
} from '../src/engine/quotas';
import { buildRenewalNotificationCopy } from '../src/notifications/renewalNotifier';
import { creditRewardOnce, validateMilestoneRequest } from '../src/engine/rewards';
import { rollWeighted } from '../src/engine/rng';
import {
  findTrioWinningLines,
  generateScratchBoard,
  resolveTicketMechanic,
} from '../src/engine/scratchBoard';
import { advanceStopwatch, getNextStopwatchThreshold } from '../src/engine/stopwatch';
import {
  createBackupEnvelope,
  executeTotalTestDataReset,
  parseAndVerifyBackup,
  restoreDefaultParametersOnly,
} from '../src/storage/localDb';
import { TicketMechanic } from '../src/types/vitrocash';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

test('1. Catalogue initial de 25 tickets et probabilités à 100 %', () => {
  const state = createInitialAppState(1_700_000_000_000);
  assert.equal(state.ticketsCatalog.length, 25);
  assert.equal(state.ticketsCatalog[0].name, 'OR IMPÉRIAL');
  assert.equal(state.ticketsCatalog[24].name, 'LÉGENDE');
  const sum = DEFAULT_TICKET_PROBABILITIES.reduce((s, p) => s + p.probability, 0);
  assert.equal(Math.round(sum * 100) / 100, 100);
});

test('2. Série de 3 tickets distincts et non-duplication', () => {
  const state = createInitialAppState(1_700_000_000_000);
  const batch = generateDistinctTicketBatch(state.ticketsCatalog, 3);
  assert.equal(batch.items.length, 3);
  const ids = new Set(batch.items.map((i) => i.ticketId));
  assert.equal(ids.size, 3);
});

test('3. Crédit atomique unique (aucun double crédit) et deux compteurs', () => {
  const base = createInitialAppState(1_700_000_000_000);
  const r1 = creditRewardOnce(base, {
    eventId: 'evt-unique-1',
    category: 'tickets',
    title: 'Ticket test',
    description: 'Gain 0,50 €',
    amount: 0.5,
  });
  assert.equal(r1.credited, true);
  assert.equal(r1.nextState.cycleBalanceCents, 50);
  assert.equal(r1.nextState.cumulativeTotalCents, 50);

  // Tentative de double crédit avec même eventId
  const r2 = creditRewardOnce(r1.nextState, {
    eventId: 'evt-unique-1',
    category: 'tickets',
    title: 'Ticket test',
    description: 'Gain 0,50 €',
    amount: 0.5,
  });
  assert.equal(r2.credited, false);
  assert.equal(r2.nextState.cycleBalanceCents, 50);
  assert.equal(r2.nextState.cumulativeTotalCents, 50);
});

test('4. Renouvellements sans accumulation ni double renouvellement (4h / 7h / 10h)', () => {
  const t0 = 1_700_000_000_000;
  const state = createInitialAppState(t0);

  // Consommer 2 tours de roue sur 3 (reste 1) -> après 21h (3 cycles de 7h), reste max 3 (jamais 7!)
  let wq = consumeQuotaAttempt(state.wheelQuota, t0);
  wq = consumeQuotaAttempt(wq, t0);
  assert.equal(wq.remaining, 1);

  const after21h = reconcileQuota(wq, 3, 7, 'FIXED_INTERVAL', t0 + 21 * 3600_000);
  assert.equal(after21h.renewed, true);
  assert.equal(after21h.quota.remaining, 3);

  // Mode AFTER_CONSUMPTION pour bandit manchot (10h)
  let sq: typeof state.slotQuota = { ...state.slotQuota, renewalMode: 'AFTER_CONSUMPTION' };
  sq = consumeQuotaAttempt(sq, t0);
  sq = consumeQuotaAttempt(sq, t0);
  assert.equal(sq.remaining, 1);
  assert.equal(sq.cooldownStartedAt, null);
  sq = consumeQuotaAttempt(sq, t0 + 1000);
  assert.equal(sq.remaining, 0);
  assert.equal(sq.cooldownStartedAt, t0 + 1000);

  const before10h = reconcileQuota(sq, 3, 10, 'AFTER_CONSUMPTION', t0 + 9 * 3600_000);
  assert.equal(before10h.renewed, false);
  assert.equal(before10h.quota.remaining, 0);

  const after10h = reconcileQuota(sq, 3, 10, 'AFTER_CONSUMPTION', t0 + 10 * 3600_000 + 2000);
  assert.equal(after10h.renewed, true);
  assert.equal(after10h.quota.remaining, 3);
});

test('5. Calibration statistique des probabilités (tickets & bandit manchot)', () => {
  const state = createInitialAppState();
  let winsSlot = 0;
  for (let i = 0; i < 5000; i++) {
    const res = rollWeighted(state.config.slots.outcomes);
    if (res.amount > 0) winsSlot++;
  }
  const slotRate = winsSlot / 5000;
  assert.ok(slotRate > 0.075 && slotRate < 0.125, `Slot win rate ${slotRate} out of bounds`);

  let zeroTicket = 0;
  for (let i = 0; i < 5000; i++) {
    const res = rollWeighted(DEFAULT_TICKET_PROBABILITIES);
    if (res.amount === 0) zeroTicket++;
  }
  const zeroRate = zeroTicket / 5000;
  assert.ok(zeroRate > 0.78 && zeroRate < 0.85, `Ticket zero rate ${zeroRate} out of bounds`);
});

test('6. Loterie quotidienne 20h00 Europe/Paris : validation, barème, bonus et rattrapage', () => {
  const cfg = createInitialAppState().config.lottery;
  assert.equal(validateLotterySelection([1, 2, 3, 4, 5], 5, cfg).valid, false);
  assert.equal(validateLotterySelection([1, 2, 3, 4, 4], 6, cfg).valid, false);
  assert.equal(validateLotterySelection([1, 2, 3, 4, 29], 6, cfg).valid, false);
  assert.equal(validateLotterySelection([1, 2, 3, 4, 5], 6, cfg).valid, true);

  // 0 + complémentaire => 0,50 €
  const ex1 = evaluateLotteryTicket([1, 2, 3, 4, 5], 10, [20, 21, 22, 23, 24], 10, cfg);
  assert.equal(ex1.totalPrize, 0.5);

  // 2 + complémentaire => 0,65 €
  const ex2 = evaluateLotteryTicket([1, 2, 3, 4, 5], 10, [1, 2, 22, 23, 24], 10, cfg);
  assert.equal(ex2.totalPrize, 0.65);

  // 5 + complémentaire => 7,50 €
  const ex3 = evaluateLotteryTicket([1, 2, 3, 4, 5], 10, [1, 2, 3, 4, 5], 10, cfg);
  assert.equal(ex3.totalPrize, 7.5);

  // Tirage manqué à 20h00 Europe/Paris rattrapé à l'ouverture suivante
  const beforeDrawMs = zonedDateTimeToUtcMs(2026, 11, 22, 19, 30, 'Europe/Paris');
  const afterDrawMs = zonedDateTimeToUtcMs(2026, 11, 22, 20, 15, 'Europe/Paris');
  let st = createInitialAppState(beforeDrawMs);
  const up = getUpcomingDrawInfo(beforeDrawMs, cfg);
  assert.equal(up.drawKey, '2026-11-22');
  st = reconcileLotteryDraws(st, beforeDrawMs);
  st.lotteryDraws['2026-11-22'].playerNumbers = [1, 2, 3, 4, 5];
  st.lotteryDraws['2026-11-22'].playerComplementary = 6;

  const afterOpen = reconcileLotteryDraws(st, afterDrawMs);
  assert.equal(afterOpen.lotteryDraws['2026-11-22'].status, 'DRAWN');
  assert.ok(afterOpen.lotteryDraws['2026-11-22'].creditedEventId);
  assert.ok(afterOpen.lotteryDraws['2026-11-23']?.status === 'OPEN');

  // Rattrapage idempotent si appelé une deuxième fois
  const secondPass = reconcileLotteryDraws(afterOpen, afterDrawMs + 5000);
  assert.equal(secondPass.cumulativeTotalCents, afterOpen.cumulativeTotalCents);
});

test('7. Chronomètre actif : seuils 1, 3, 7, 15, 31, 63, 103 puis +40 min', () => {
  let st = createInitialAppState();
  assert.equal(getNextStopwatchThreshold(0, [], st.config.stopwatch), 1);

  // Avancer de 103 minutes (6180s) -> 7 seuils (0,07 €)
  st = advanceStopwatch(st, 103 * 60);
  assert.deepEqual(st.stopwatch.awardedThresholds, [1, 3, 7, 15, 31, 63, 103]);
  assert.equal(st.cycleBalanceCents, 7);

  // Avancer encore de 40 minutes (143 min) -> +0,01 € (total 8 seuils)
  st = advanceStopwatch(st, 40 * 60);
  assert.deepEqual(st.stopwatch.awardedThresholds, [1, 3, 7, 15, 31, 63, 103, 143]);
  assert.equal(st.cycleBalanceCents, 8);
  assert.equal(getNextStopwatchThreshold(143, st.stopwatch.awardedThresholds, st.config.stopwatch), 183);
});

test('8. Paliers : déclenchement à 5,00 € et remise à zéro du cycle sans toucher au total cumulé', () => {
  let st = createInitialAppState();
  const res = creditRewardOnce(st, {
    eventId: 'big-win-test',
    category: 'lottery',
    title: 'Gain test palier',
    description: '5,50 €',
    amount: 5.5,
  });
  st = res.nextState;
  assert.ok(res.milestoneTriggered);
  assert.equal(st.cycleBalanceCents, 550);
  assert.equal(st.cumulativeTotalCents, 550);

  const validated = validateMilestoneRequest(st, res.milestoneTriggered!.id, 'Validé test');
  assert.equal(validated.cycleBalanceCents, 0);
  assert.equal(validated.cumulativeTotalCents, 550);
  assert.equal(validated.milestones[0].status, 'VALIDATED');
});

test('9. Sauvegarde export/import avec vérification d\'intégrité', () => {
  let st = createInitialAppState();
  st = creditRewardOnce(st, {
    eventId: 'ev-bkp',
    category: 'wheel',
    title: 'Test',
    description: 'Test',
    amount: 1.0,
  }).nextState;

  const { envelope } = createBackupEnvelope(st);
  const json = JSON.stringify(envelope);
  const ok = parseAndVerifyBackup(json);
  assert.equal(ok.valid, true);
  assert.equal(ok.state?.cumulativeTotalCents, 100);

  // Altération détectée
  const tampered = json.replace('"cumulativeTotalCents":100', '"cumulativeTotalCents":99999');
  const bad = parseAndVerifyBackup(tampered);
  assert.equal(bad.valid, false);
});

test('10. RÉINITIALISATION TOTALE DES DONNÉES DE TEST & restauration paramètres', () => {
  let st = createInitialAppState();
  st.config.security.adminCode = '9999Z';
  st.ticketsCatalog.push({
    ...st.ticketsCatalog[0],
    id: 'tk-custom-26',
    name: 'TICKET PERSO 26',
  });
  st = creditRewardOnce(st, {
    eventId: 'ev-rst',
    category: 'tickets',
    title: 'Gain',
    description: 'Gain',
    amount: 2.0,
  }).nextState;
  st = advanceStopwatch(st, 120);

  const reset = executeTotalTestDataReset(st);
  assert.equal(reset.cycleBalanceCents, 0);
  assert.equal(reset.cumulativeTotalCents, 0);
  assert.equal(reset.history.length, 0);
  assert.equal(reset.stopwatch.totalActiveSeconds, 0);
  assert.equal(reset.ticketsCatalog.length, 26);
  assert.equal(reset.config.security.adminCode, '9999Z');

  // Restauration paramètres par défaut sans effacer historique/crédits
  const withWin = creditRewardOnce(reset, {
    eventId: 'ev-keep',
    category: 'wheel',
    title: 'Gain conservé',
    description: '1,00 €',
    amount: 1.0,
  }).nextState;
  const restoredParams = restoreDefaultParametersOnly(withWin);
  assert.equal(restoredParams.cumulativeTotalCents, 100);
  assert.equal(restoredParams.history.length, 1);
});

test('11. Conservation historique des tickets archivés ou supprimés', () => {
  let st = createInitialAppState();
  const targetTicket = st.ticketsCatalog[0];
  st = creditRewardOnce(st, {
    eventId: 'tk-arch-1',
    category: 'tickets',
    title: `Ticket · ${targetTicket.name}`,
    description: 'Gain 1,00 €',
    amount: 1.0,
    ticketId: targetTicket.id,
    ticketName: targetTicket.name,
  }).nextState;

  // Archiver puis supprimer le ticket du catalogue
  st.ticketsCatalog = st.ticketsCatalog.filter((t) => t.id !== targetTicket.id);
  assert.equal(st.history.length, 1);
  assert.equal(st.history[0].ticketName, 'OR IMPÉRIAL');
});

test('12. Rattrapage loterie sur plusieurs jours sans décalage de calendrier', () => {
  const monday = zonedDateTimeToUtcMs(2026, 11, 16, 18, 0, 'Europe/Paris');
  const thursday = zonedDateTimeToUtcMs(2026, 11, 19, 10, 0, 'Europe/Paris');

  let st = createInitialAppState(monday);
  st = reconcileLotteryDraws(st, monday);
  st.lotteryDraws['2026-11-16'].playerNumbers = [2, 5, 11, 17, 24];
  st.lotteryDraws['2026-11-16'].playerComplementary = 8;

  const afterReopen = reconcileLotteryDraws(st, thursday);
  assert.equal(afterReopen.lotteryDraws['2026-11-16'].status, 'DRAWN');
  assert.equal(afterReopen.lotteryDraws['2026-11-19'].status, 'OPEN');
  assert.equal(afterReopen.lotteryDraws['2026-11-19'].drawKey, '2026-11-19');
});

test('13. 6 mécaniques de tickets à gratter : cohérence stricte des plateaux gagnants & perdants', () => {
  const st = createInitialAppState();
  const mechanicsSet = new Set(st.ticketsCatalog.map((t) => resolveTicketMechanic(t)));
  assert.equal(mechanicsSet.size, 6);

  const allMechanics: TicketMechanic[] = [
    'vault_duo',
    'fetiche_numbers',
    'celestial_signs',
    'duel_match',
    'trio_symbols',
    'treasure_cascade',
  ];

  for (const mech of allMechanics) {
    const def = st.ticketsCatalog.find((t) => resolveTicketMechanic(t) === mech)!;
    for (let i = 0; i < 15; i++) {
      const winBoard = generateScratchBoard(
        { instanceId: `win-${mech}-${i}`, ticketId: def.id, rewardAmount: 0.2 },
        def,
      );
      assert.equal(winBoard.isWin, true);
      assert.equal(winBoard.rewardCents, 20);

      const loseBoard = generateScratchBoard(
        { instanceId: `lose-${mech}-${i}`, ticketId: def.id, rewardAmount: 0 },
        def,
      );
      assert.equal(loseBoard.isWin, false);
      assert.equal(loseBoard.rewardCents, 0);

      if (winBoard.mechanic === 'vault_duo' && loseBoard.mechanic === 'vault_duo') {
        assert.equal(winBoard.vaults.filter((v) => v.amountCents === 20).length, 2);
        assert.equal(new Set(loseBoard.vaults.map((v) => v.amountCents)).size, 3);
      } else if (winBoard.mechanic === 'fetiche_numbers' && loseBoard.mechanic === 'fetiche_numbers') {
        assert.equal(winBoard.cells.filter((c) => c.isMatch && c.amountCents === 20).length, 1);
        assert.equal(
          loseBoard.cells.some((c) => loseBoard.feticheNumbers.includes(c.num)),
          false,
        );
      } else if (winBoard.mechanic === 'celestial_signs' && loseBoard.mechanic === 'celestial_signs') {
        assert.equal(winBoard.orbs.filter((o) => o.isMatch).length, 2);
        assert.ok(loseBoard.orbs.filter((o) => o.isMatch).length <= 1);
      } else if (winBoard.mechanic === 'duel_match' && loseBoard.mechanic === 'duel_match') {
        const wonDuels = winBoard.duels.filter((d) => d.playerScore > d.opponentScore);
        assert.equal(wonDuels.length, 1);
        assert.equal(wonDuels[0].amountCents, 20);
        assert.equal(
          loseBoard.duels.some((d) => d.playerScore >= d.opponentScore),
          false,
        );
      } else if (winBoard.mechanic === 'trio_symbols' && loseBoard.mechanic === 'trio_symbols') {
        assert.equal(findTrioWinningLines(winBoard.grid).length, 1);
        assert.equal(findTrioWinningLines(loseBoard.grid).length, 0);
      } else if (winBoard.mechanic === 'treasure_cascade' && loseBoard.mechanic === 'treasure_cascade') {
        const hit = winBoard.relics.find((r) => r.isMatch);
        assert.ok(hit);
        assert.equal(hit.amountCents * winBoard.multiplier, 20);
        assert.equal(
          loseBoard.relics.some((r) => r.glyph === loseBoard.targetSymbol.glyph),
          false,
        );
      }
    }
  }
});

test('14. Notifications de renouvellement : uniquement après avoir atteint 0 et sans doublon', () => {
  const t0 = 1_700_000_000_000;
  let st = createInitialAppState(t0);

  // Consommer les 3 tickets jusqu'à 0, laisser la roue à 1 (> 0)
  st = {
    ...st,
    ticketQuota: consumeQuotaAttempt(
      consumeQuotaAttempt(consumeQuotaAttempt(st.ticketQuota, t0), t0),
      t0,
    ),
    wheelQuota: consumeQuotaAttempt(consumeQuotaAttempt(st.wheelQuota, t0), t0),
  };
  assert.equal(st.ticketQuota.remaining, 0);
  assert.equal(st.wheelQuota.remaining, 1);

  // 4h plus tard : seuls les tickets (qui étaient à 0) doivent déclencher la notification
  const after4h = reconcileAllQuotasWithRenewals(st, t0 + 4 * 3600_000);
  assert.equal(after4h.nextState.ticketQuota.remaining, 3);
  assert.equal(after4h.renewedFromZero.length, 1);
  assert.equal(after4h.renewedFromZero[0].key, 'tickets');
  const copy = buildRenewalNotificationCopy(after4h.renewedFromZero);
  assert.equal(copy.title, 'VITROCASH : Un jeu est de nouveau accessible !!!');
  assert.ok(copy.body.includes('Tickets à Gratter'));

  // Re-réconciliation immédiate : aucun doublon
  const secondPass = reconcileAllQuotasWithRenewals(after4h.nextState, t0 + 4 * 3600_000 + 1000);
  assert.equal(secondPass.renewedFromZero.length, 0);

  // 7h plus tard : la roue était à 1 (n'avait pas atteint 0), donc aucune notification sur la roue
  const after7h = reconcileAllQuotasWithRenewals(secondPass.nextState, t0 + 7 * 3600_000);
  assert.equal(after7h.nextState.wheelQuota.remaining, 3);
  assert.equal(after7h.renewedFromZero.length, 0);
});

console.log(`\nToutes les assertions (${passed}/14 suites) ont réussi.`);
