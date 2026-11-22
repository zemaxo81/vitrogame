import {
  AppConfig,
  AppState,
  ProbabilityTier,
  SlotSymbol,
  TicketDefinition,
  TicketMechanic,
  WheelSegment,
} from '../types/vitrocash';

export const SCHEMA_VERSION = 1;

export const TICKET_MECHANIC_META: Record<
  TicketMechanic,
  {
    label: string;
    shortLabel: string;
    rule: string;
    foilHint: string;
  }
> = {
  vault_duo: {
    label: 'Coffres Duo (façon express)',
    shortLabel: 'Coffres Duo',
    rule: 'Grattez les 3 coffres : 2 montants identiques = vous remportez ce gain !',
    foilHint: '3 Coffres Prestige',
  },
  fetiche_numbers: {
    label: 'Numéros Fétiches (façon N° gagnants)',
    shortLabel: 'N° Fétiches',
    rule: 'Retrouvez l’un de vos 2 Numéros Fétiches dans les 6 cases pour gagner son montant.',
    foilHint: '2 Fétiches + 6 Cases',
  },
  celestial_signs: {
    label: 'Signes Astraux (façon Astro)',
    shortLabel: 'Signes Astraux',
    rule: 'Obtenez 2 fois votre Signe Maître parmi les 4 Orbes pour débloquer le Gain Astral.',
    foilHint: 'Signe Maître + 4 Orbes',
  },
  duel_match: {
    label: 'Duel des Champions (façon Match)',
    shortLabel: 'Duel Match',
    rule: '3 manches : si Votre Score dépasse celui de l’Adversaire, vous gagnez le lot associé.',
    foilHint: '3 Manches Duel',
  },
  trio_symbols: {
    label: 'Grille Trio 3×3 (alignement)',
    shortLabel: 'Grille Trio',
    rule: 'Alignez 3 symboles d’Or identiques (ligne, colonne ou diagonale) pour gagner le Trésor.',
    foilHint: 'Grille 3×3 + Gain',
  },
  treasure_cascade: {
    label: 'Relique & Multiplicateur (×1 / ×2 / ×5)',
    shortLabel: 'Relique ×Mult',
    rule: 'Découvrez le Symbole Sacré parmi les 4 reliques et multipliez son gain par le Bonus.',
    foilHint: '4 Reliques + Bonus ×',
  },
};

export const DEFAULT_TICKET_PROBABILITIES: ProbabilityTier[] = [
  { id: 't-000', amount: 0.0, probability: 81.2, label: '0,00 €', color: '#475569' },
  { id: 't-001', amount: 0.01, probability: 10.0, label: '0,01 €', color: '#38BDF8' },
  { id: 't-002', amount: 0.02, probability: 5.0, label: '0,02 €', color: '#3B82F6' },
  { id: 't-005', amount: 0.05, probability: 2.0, label: '0,05 €', color: '#8B5CF6' },
  { id: 't-010', amount: 0.1, probability: 1.0, label: '0,10 €', color: '#A855F7' },
  { id: 't-020', amount: 0.2, probability: 0.5, label: '0,20 €', color: '#F59E0B' },
  { id: 't-050', amount: 0.5, probability: 0.2, label: '0,50 €', color: '#FBBF24' },
  { id: 't-100', amount: 1.0, probability: 0.1, label: '1,00 €', color: '#FDE047' },
];

export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'w-000', label: '0,00 €', amount: 0.0, probability: 81.2, color: '#1E133D', textColor: '#CBD5E1' },
  { id: 'w-001', label: '0,01 €', amount: 0.01, probability: 10.0, color: '#1D4ED8', textColor: '#FFFFFF' },
  { id: 'w-002', label: '0,02 €', amount: 0.02, probability: 5.0, color: '#4C1D95', textColor: '#FDE68A' },
  { id: 'w-005', label: '0,05 €', amount: 0.05, probability: 2.0, color: '#0284C7', textColor: '#FFFFFF' },
  { id: 'w-010', label: '0,10 €', amount: 0.1, probability: 1.0, color: '#6D28D9', textColor: '#FEF08A' },
  { id: 'w-020', label: '0,20 €', amount: 0.2, probability: 0.5, color: '#2563EB', textColor: '#FFFFFF' },
  { id: 'w-050', label: '0,50 €', amount: 0.5, probability: 0.2, color: '#B45309', textColor: '#FEF9C3' },
  { id: 'w-100', label: '1,00 €', amount: 1.0, probability: 0.1, color: '#D97706', textColor: '#FFFFFF' },
];

export const DEFAULT_SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'sym-seven', name: 'Sept d\'Or', glyph: '7', color: '#FBBF24' },
  { id: 'sym-diamond', name: 'Diamant Bleu', glyph: '◆', color: '#38BDF8' },
  { id: 'sym-crown', name: 'Couronne', glyph: '♛', color: '#F59E0B' },
  { id: 'sym-star', name: 'Étoile', glyph: '★', color: '#A855F7' },
  { id: 'sym-clover', name: 'Trèfle', glyph: '♣', color: '#34D399' },
  { id: 'sym-ruby', name: 'Rubis', glyph: '♦', color: '#FB7185' },
];

const INITIAL_TICKET_SPECS: Array<{
  id: string;
  name: string;
  theme: string;
  description: string;
  illustrationKey: string;
  mechanic: TicketMechanic;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}> = [
  { id: 'tk-01', name: 'OR IMPÉRIAL', theme: 'Prestige Doré', description: 'Lingots impériaux et couronne d\'or pur.', illustrationKey: 'crown', mechanic: 'vault_duo', primaryColor: '#2A1806', secondaryColor: '#78350F', accentColor: '#FBBF24' },
  { id: 'tk-02', name: 'DIAMANT BLEU', theme: 'Haute Joaillerie', description: 'Éclats de saphir cristallin et lumière électrique.', illustrationKey: 'diamond', mechanic: 'trio_symbols', primaryColor: '#091A38', secondaryColor: '#1E3A8A', accentColor: '#38BDF8' },
  { id: 'tk-03', name: 'TRÉSOR ROYAL', theme: 'Coffre des Rois', description: 'Coffre scellé renfermant des pièces royales.', illustrationKey: 'chest', mechanic: 'vault_duo', primaryColor: '#240E42', secondaryColor: '#581C87', accentColor: '#F59E0B' },
  { id: 'tk-04', name: 'NUIT ÉTOILÉE', theme: 'Voûte Céleste', description: 'Constellations d\'or sous un ciel minuit.', illustrationKey: 'moon', mechanic: 'celestial_signs', primaryColor: '#0A0B24', secondaryColor: '#1E1B4B', accentColor: '#FDE047' },
  { id: 'tk-05', name: 'GALAXIE', theme: 'Infini Cosmique', description: 'Spirale stellaire aux reflets électriques.', illustrationKey: 'galaxy', mechanic: 'celestial_signs', primaryColor: '#13072E', secondaryColor: '#311068', accentColor: '#60A5FA' },
  { id: 'tk-06', name: 'TRÉSOR DES PIRATES', theme: 'Expédition Marine', description: 'Boussole dorée et duel en haute mer.', illustrationKey: 'compass', mechanic: 'duel_match', primaryColor: '#1B1124', secondaryColor: '#4A1D2B', accentColor: '#FBBF24' },
  { id: 'tk-07', name: 'JUNGLE', theme: 'Sanctuaire Émeraude', description: 'Feuillage tropical et reliques maya dorées.', illustrationKey: 'leaf', mechanic: 'trio_symbols', primaryColor: '#07241A', secondaryColor: '#064E3B', accentColor: '#34D399' },
  { id: 'tk-08', name: 'CRISTAL', theme: 'Prisme Polaire', description: 'Facettes glacées aux reflets bleu-violet.', illustrationKey: 'crystal', mechanic: 'trio_symbols', primaryColor: '#0E1C36', secondaryColor: '#1E40AF', accentColor: '#7DD3FC' },
  { id: 'tk-09', name: "FEU D'OR", theme: 'Flamme Solaire', description: 'Brasier incandescent forgé d\'or pur.', illustrationKey: 'flame', mechanic: 'duel_match', primaryColor: '#290E08', secondaryColor: '#7C2D12', accentColor: '#FB923C' },
  { id: 'tk-10', name: 'LUCKY STAR', theme: 'Étoile Porte-Bonheur', description: 'Astres brillants et numéros porte-bonheur.', illustrationKey: 'star', mechanic: 'fetiche_numbers', primaryColor: '#1E0B3B', secondaryColor: '#4338CA', accentColor: '#FDE047' },
  { id: 'tk-11', name: 'SECRET', theme: 'Coffre Confidentiel', description: 'Clé d\'or et combinaison secrète.', illustrationKey: 'key', mechanic: 'fetiche_numbers', primaryColor: '#170D2E', secondaryColor: '#3B0764', accentColor: '#F59E0B' },
  { id: 'tk-12', name: 'ÉCLAT', theme: 'Rayon Électrique', description: 'Énergie pure et numéros lumineux.', illustrationKey: 'bolt', mechanic: 'fetiche_numbers', primaryColor: '#081833', secondaryColor: '#1D4ED8', accentColor: '#38BDF8' },
  { id: 'tk-13', name: 'ÉNIGME', theme: 'Labyrinthe Sacré', description: 'Symboles mystérieux des maîtres anciens.', illustrationKey: 'labyrinth', mechanic: 'trio_symbols', primaryColor: '#191030', secondaryColor: '#4C1D95', accentColor: '#C084FC' },
  { id: 'tk-14', name: 'ROYAUME', theme: 'Forteresse d\'Or', description: 'Blason royal et coffres fortifiés.', illustrationKey: 'castle', mechanic: 'vault_duo', primaryColor: '#1F1135', secondaryColor: '#3730A3', accentColor: '#FBBF24' },
  { id: 'tk-15', name: 'COSMOS', theme: 'Orbite Stellaire', description: 'Anneaux planétaires et signes célestes.', illustrationKey: 'planet', mechanic: 'celestial_signs', primaryColor: '#0A102B', secondaryColor: '#312E81', accentColor: '#60A5FA' },
  { id: 'tk-16', name: 'RUBIS', theme: 'Gemme Pourpre', description: 'Rubis taillé serti de chiffres d\'or.', illustrationKey: 'ruby', mechanic: 'fetiche_numbers', primaryColor: '#2B0918', secondaryColor: '#881337', accentColor: '#FB7185' },
  { id: 'tk-17', name: 'SAPHIR', theme: 'Pierre Royale', description: 'Saphir profond et tirage fétiche.', illustrationKey: 'sapphire', mechanic: 'fetiche_numbers', primaryColor: '#091538', secondaryColor: '#1E3A8A', accentColor: '#60A5FA' },
  { id: 'tk-18', name: 'ÉCLIPSE', theme: 'Alignement Solaire', description: 'Couronne solaire dorée et multiplicateur.', illustrationKey: 'eclipse', mechanic: 'treasure_cascade', primaryColor: '#0F091F', secondaryColor: '#3B1D5E', accentColor: '#F59E0B' },
  { id: 'tk-19', name: 'DRAGON', theme: 'Gardien Impérial', description: 'Affrontez la puissance du dragon d\'or.', illustrationKey: 'dragon', mechanic: 'duel_match', primaryColor: '#240B1A', secondaryColor: '#6B1330', accentColor: '#FBBF24' },
  { id: 'tk-20', name: 'AURORA', theme: 'Aurore Boréale', description: 'Voiles lumineux polaires bleu-violet.', illustrationKey: 'aurora', mechanic: 'celestial_signs', primaryColor: '#081C2E', secondaryColor: '#1E3A5F', accentColor: '#2DD4BF' },
  { id: 'tk-21', name: 'MYSTÈRE', theme: 'Masque Vénitien', description: 'Masque doré et bonus multiplicateur.', illustrationKey: 'mask', mechanic: 'treasure_cascade', primaryColor: '#1B0C33', secondaryColor: '#581C87', accentColor: '#FDE68A' },
  { id: 'tk-22', name: 'PHARAON', theme: 'Sables d\'Or', description: 'Pyramide sacrée et multiplicateur royal.', illustrationKey: 'pyramid', mechanic: 'treasure_cascade', primaryColor: '#241807', secondaryColor: '#713F12', accentColor: '#FACC15' },
  { id: 'tk-23', name: 'NÉBULEUSE', theme: 'Nuage Stellaire', description: 'Voiles cosmiques et signes astraux.', illustrationKey: 'nebula', mechanic: 'celestial_signs', primaryColor: '#150830', secondaryColor: '#4338CA', accentColor: '#A78BFA' },
  { id: 'tk-24', name: 'COURONNE', theme: 'Diadème Royal', description: 'Joyaux sertis sur or fin.', illustrationKey: 'tiara', mechanic: 'vault_duo', primaryColor: '#1D0F38', secondaryColor: '#6D28D9', accentColor: '#FBBF24' },
  { id: 'tk-25', name: 'LÉGENDE', theme: 'Épée Mythique', description: 'Lame légendaire contre les gardiens.', illustrationKey: 'sword', mechanic: 'duel_match', primaryColor: '#0D1330', secondaryColor: '#1E40AF', accentColor: '#FDE047' },
];

export function createInitialTicketsCatalog(now = Date.now()): TicketDefinition[] {
  return INITIAL_TICKET_SPECS.map((spec) => ({
    ...spec,
    status: 'active',
    probabilities: DEFAULT_TICKET_PROBABILITIES.map((tier) => ({ ...tier })),
    createdAt: now,
    updatedAt: now,
    isInitial: true,
  }));
}

export function createDefaultConfig(): AppConfig {
  return {
    general: {
      appName: 'VITROCASH',
      playerName: 'Erika',
      welcomeSubtitle: 'Espace Divertissement · Crédits Fictifs',
      disclaimerText:
        'Crédits 100 % fictifs sans valeur monétaire. Aucun argent réel, aucun achat, aucun transfert ni retrait.',
    },
    tickets: {
      batchSize: 3,
      intervalHours: 4,
      renewalMode: 'FIXED_INTERVAL',
    },
    wheel: {
      maxSpins: 3,
      intervalHours: 7,
      renewalMode: 'FIXED_INTERVAL',
      segments: DEFAULT_WHEEL_SEGMENTS.map((s) => ({ ...s })),
    },
    slots: {
      maxSpins: 3,
      intervalHours: 10,
      renewalMode: 'FIXED_INTERVAL',
      symbols: DEFAULT_SLOT_SYMBOLS.map((s) => ({ ...s })),
      outcomes: [
        { id: 'sl-lose', amount: 0.0, probability: 90.0, label: '0,00 €' },
        { id: 'sl-win', amount: 0.1, probability: 10.0, label: '0,10 €' },
      ],
    },
    lottery: {
      drawHour: 20,
      drawMinute: 0,
      timezone: 'Europe/Paris',
      cutoffMinutesBeforeDraw: 1,
      maxNumber: 28,
      mainPickCount: 5,
      prizeScale: {
        0: 0.0,
        1: 0.05,
        2: 0.15,
        3: 0.5,
        4: 2.0,
        5: 7.0,
      },
      complementaryBonus: 0.5,
    },
    stopwatch: {
      trackedActivities: ['tickets', 'wheel', 'slots', 'lottery'],
      initialThresholdsMinutes: [1, 3, 7, 15, 31, 63, 103],
      repeatIntervalMinutes: 40,
      rewardPerThreshold: 0.01,
      autoPauseIdleSeconds: 60,
    },
    milestones: {
      thresholdAmount: 5.0,
      pendingMessage:
        'Palier de 5,00 € de crédits fictifs atteint ! Demande de validation transmise à Jean.',
      validatedMessage:
        'Palier validé par Jean ! Le solde du cycle repart à 0,00 € et le total cumulé est conservé.',
      resetCycleOnValidation: true,
      allowPlayWhilePending: true,
    },
    appearance: {
      glowIntensity: 'medium',
      compactCards: false,
      showDisclaimerBanner: true,
    },
    sounds: {
      masterEnabled: true,
      volume: 0.65,
      ticketsEnabled: true,
      wheelEnabled: true,
      slotsEnabled: true,
      lotteryEnabled: true,
      victoryEnabled: true,
    },
    animations: {
      masterEnabled: true,
      intensity: 'normal',
      lightsEnabled: true,
      hapticsEnabled: true,
      hapticsIntensity: 'medium',
      wheelSpinDurationMs: 4600,
      slotSpinDurationMs: 2200,
    },
    splash: {
      enabled: true,
      durationSeconds: 5,
      logoSizePx: 42,
      logoTopPercent: 18,
      coinSizePx: 170,
      coinBottomPercent: 16,
      rotationSpeedSeconds: 3.2,
      rotationDirection: 'normal',
      coinModel: 'imperial_gold',
      glowEnabled: true,
      reflectionEnabled: true,
    },
    security: {
      adminCode: '6226A',
      maxFailedAttempts: 5,
      lockoutSeconds: 60,
    },
  };
}

export function createInitialAppState(now = Date.now(), currentLotteryKey = ''): AppState {
  const config = createDefaultConfig();
  return {
    schemaVersion: SCHEMA_VERSION,
    cycleBalanceCents: 0,
    cumulativeTotalCents: 0,
    creditedEventIds: [],
    ticketsCatalog: createInitialTicketsCatalog(now),
    ticketQuota: {
      remaining: config.tickets.batchSize,
      maxAttempts: config.tickets.batchSize,
      intervalHours: config.tickets.intervalHours,
      renewalMode: config.tickets.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        config.tickets.renewalMode === 'FIXED_INTERVAL'
          ? now + config.tickets.intervalHours * 3600_000
          : null,
      lastRenewalId: `tk-init-${now}`,
    },
    activeTicketBatch: null,
    wheelQuota: {
      remaining: config.wheel.maxSpins,
      maxAttempts: config.wheel.maxSpins,
      intervalHours: config.wheel.intervalHours,
      renewalMode: config.wheel.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        config.wheel.renewalMode === 'FIXED_INTERVAL'
          ? now + config.wheel.intervalHours * 3600_000
          : null,
      lastRenewalId: `wh-init-${now}`,
    },
    slotQuota: {
      remaining: config.slots.maxSpins,
      maxAttempts: config.slots.maxSpins,
      intervalHours: config.slots.intervalHours,
      renewalMode: config.slots.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        config.slots.renewalMode === 'FIXED_INTERVAL'
          ? now + config.slots.intervalHours * 3600_000
          : null,
      lastRenewalId: `sl-init-${now}`,
    },
    lotteryDraws: {},
    currentLotteryKey,
    stopwatch: {
      totalActiveSeconds: 0,
      sessionActiveSeconds: 0,
      lastTickAt: null,
      isPaused: false,
      pauseReason: null,
      awardedThresholds: [],
    },
    milestones: [],
    history: [],
    adminAudit: [],
    lastBackupAt: null,
    securityLockout: {
      failedAttempts: 0,
      lockedUntil: null,
    },
    config,
  };
}
