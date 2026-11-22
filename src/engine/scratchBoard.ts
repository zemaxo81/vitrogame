import { TicketDefinition, TicketInstance, TicketMechanic } from '../types/vitrocash';
import { toCents } from './rng';

export interface ScratchSymbol {
  glyph: string;
  label: string;
}

export type ScratchBoardData =
  | {
      mechanic: 'vault_duo';
      rewardCents: number;
      isWin: boolean;
      vaults: Array<{ amountCents: number; isMatch: boolean }>;
    }
  | {
      mechanic: 'fetiche_numbers';
      rewardCents: number;
      isWin: boolean;
      feticheNumbers: [number, number];
      cells: Array<{ num: number; amountCents: number; isMatch: boolean }>;
    }
  | {
      mechanic: 'celestial_signs';
      rewardCents: number;
      isWin: boolean;
      masterSign: ScratchSymbol;
      orbs: Array<ScratchSymbol & { isMatch: boolean }>;
      gainCents: number;
    }
  | {
      mechanic: 'duel_match';
      rewardCents: number;
      isWin: boolean;
      playerLabel: string;
      opponentLabel: string;
      duels: Array<{
        roundLabel: string;
        playerScore: number;
        opponentScore: number;
        amountCents: number;
        isWin: boolean;
      }>;
    }
  | {
      mechanic: 'trio_symbols';
      rewardCents: number;
      isWin: boolean;
      grid: ScratchSymbol[];
      winningLine: [number, number, number] | null;
      gainCents: number;
    }
  | {
      mechanic: 'treasure_cascade';
      rewardCents: number;
      isWin: boolean;
      targetSymbol: ScratchSymbol;
      multiplier: 1 | 2 | 5;
      relics: Array<ScratchSymbol & { amountCents: number; isMatch: boolean }>;
    };

const FALLBACK_BY_TICKET_ID: Record<string, TicketMechanic> = {
  'tk-01': 'vault_duo',
  'tk-02': 'trio_symbols',
  'tk-03': 'vault_duo',
  'tk-04': 'celestial_signs',
  'tk-05': 'celestial_signs',
  'tk-06': 'duel_match',
  'tk-07': 'trio_symbols',
  'tk-08': 'trio_symbols',
  'tk-09': 'duel_match',
  'tk-10': 'fetiche_numbers',
  'tk-11': 'fetiche_numbers',
  'tk-12': 'fetiche_numbers',
  'tk-13': 'trio_symbols',
  'tk-14': 'vault_duo',
  'tk-15': 'celestial_signs',
  'tk-16': 'fetiche_numbers',
  'tk-17': 'fetiche_numbers',
  'tk-18': 'treasure_cascade',
  'tk-19': 'duel_match',
  'tk-20': 'celestial_signs',
  'tk-21': 'treasure_cascade',
  'tk-22': 'treasure_cascade',
  'tk-23': 'celestial_signs',
  'tk-24': 'vault_duo',
  'tk-25': 'duel_match',
};

const ALL_MECHANICS: TicketMechanic[] = [
  'vault_duo',
  'fetiche_numbers',
  'celestial_signs',
  'duel_match',
  'trio_symbols',
  'treasure_cascade',
];

export function resolveTicketMechanic(ticket?: Partial<TicketDefinition> | null): TicketMechanic {
  if (ticket?.mechanic && ALL_MECHANICS.includes(ticket.mechanic)) {
    return ticket.mechanic;
  }
  if (ticket?.id && FALLBACK_BY_TICKET_ID[ticket.id]) {
    return FALLBACK_BY_TICKET_ID[ticket.id];
  }
  const key = ticket?.illustrationKey ?? '';
  if (['crown', 'chest', 'castle', 'tiara'].includes(key)) return 'vault_duo';
  if (['moon', 'galaxy', 'planet', 'aurora', 'nebula'].includes(key)) return 'celestial_signs';
  if (['compass', 'flame', 'dragon', 'sword'].includes(key)) return 'duel_match';
  if (['diamond', 'leaf', 'crystal', 'labyrinth'].includes(key)) return 'trio_symbols';
  if (['eclipse', 'mask', 'pyramid'].includes(key)) return 'treasure_cascade';
  return 'fetiche_numbers';
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seedStr: string): () => number {
  let a = hashSeed(seedStr) || 123456789;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickShuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DECOY_CENTS = [1, 2, 5, 10, 20, 50, 100, 200];

const CELESTIAL_SYMBOLS: ScratchSymbol[] = [
  { glyph: '☀', label: 'Soleil' },
  { glyph: '☽', label: 'Lune' },
  { glyph: '★', label: 'Étoile' },
  { glyph: '✦', label: 'Astre' },
  { glyph: '☄', label: 'Comète' },
  { glyph: '◈', label: 'Vénus' },
];

const TRIO_SYMBOLS_BY_KEY: Record<string, ScratchSymbol[]> = {
  diamond: [
    { glyph: '◆', label: 'Diamant' },
    { glyph: '✦', label: 'Éclat' },
    { glyph: '♛', label: 'Couronne' },
    { glyph: '★', label: 'Étoile' },
  ],
  crystal: [
    { glyph: '❄', label: 'Cristal' },
    { glyph: '◆', label: 'Prisme' },
    { glyph: '✦', label: 'Givre' },
    { glyph: '★', label: 'Polair' },
  ],
  leaf: [
    { glyph: '♣', label: 'Totem' },
    { glyph: '☀', label: 'Maya' },
    { glyph: '◆', label: 'Émeraude' },
    { glyph: '★', label: 'Idole' },
  ],
  labyrinth: [
    { glyph: '◈', label: 'Rune' },
    { glyph: '🗝', label: 'Clé' },
    { glyph: '☽', label: 'Arcane' },
    { glyph: '★', label: 'Sceau' },
  ],
};

const CASCADE_SYMBOLS_BY_KEY: Record<string, ScratchSymbol[]> = {
  eclipse: [
    { glyph: '☀', label: 'Éclipse' },
    { glyph: '☽', label: 'Croissant' },
    { glyph: '★', label: 'Astre' },
    { glyph: '☄', label: 'Météore' },
    { glyph: '✦', label: 'Rayon' },
  ],
  mask: [
    { glyph: '♛', label: 'Masque' },
    { glyph: '🗝', label: 'Secret' },
    { glyph: '◆', label: 'Rubis' },
    { glyph: '★', label: 'Bal' },
    { glyph: '♣', label: 'Velours' },
  ],
  pyramid: [
    { glyph: '▲', label: 'Pyramide' },
    { glyph: '☀', label: 'Râ' },
    { glyph: '◈', label: 'Scarabée' },
    { glyph: '🗝', label: 'Ankh' },
    { glyph: '♛', label: 'Pharaon' },
  ],
};

const TRIO_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function findTrioWinningLines(grid: ScratchSymbol[]): Array<[number, number, number]> {
  const winners: Array<[number, number, number]> = [];
  for (const line of TRIO_LINES) {
    const [a, b, c] = line;
    if (grid[a]?.glyph && grid[a].glyph === grid[b]?.glyph && grid[a].glyph === grid[c]?.glyph) {
      winners.push(line);
    }
  }
  return winners;
}

function transform3x3(base: number[], rotations: number, flipH: boolean): number[] {
  let g = [...base];
  for (let r = 0; r < rotations; r++) {
    g = [g[6], g[3], g[0], g[7], g[4], g[1], g[8], g[5], g[2]];
  }
  if (flipH) {
    g = [g[2], g[1], g[0], g[5], g[4], g[3], g[8], g[7], g[6]];
  }
  return g;
}

export function generateScratchBoard(
  instance: Pick<TicketInstance, 'instanceId' | 'ticketId' | 'rewardAmount'>,
  definition?: Partial<TicketDefinition> | null,
): ScratchBoardData {
  const mechanic = resolveTicketMechanic(definition ?? { id: instance.ticketId });
  const rng = createSeededRng(`${instance.instanceId}:${instance.ticketId}:${mechanic}`);
  const rewardCents = Math.max(0, toCents(instance.rewardAmount));
  const isWin = rewardCents > 0;

  switch (mechanic) {
    case 'vault_duo': {
      const decoys = pickShuffled(
        DECOY_CENTS.filter((c) => c !== rewardCents),
        rng,
      );
      if (isWin) {
        const vaults = [
          { amountCents: rewardCents, isMatch: true },
          { amountCents: rewardCents, isMatch: true },
          { amountCents: decoys[0], isMatch: false },
        ];
        return {
          mechanic: 'vault_duo',
          rewardCents,
          isWin: true,
          vaults: pickShuffled(vaults, rng),
        };
      }
      return {
        mechanic: 'vault_duo',
        rewardCents: 0,
        isWin: false,
        vaults: decoys.slice(0, 3).map((amountCents) => ({ amountCents, isMatch: false })),
      };
    }

    case 'fetiche_numbers': {
      const pool = pickShuffled(
        Array.from({ length: 39 }, (_, i) => i + 1),
        rng,
      );
      const feticheNumbers: [number, number] = [pool[0], pool[1]];
      const nonMatches = pool.slice(2, 8);
      const decoyAmounts = pickShuffled(DECOY_CENTS, rng);

      if (isWin) {
        const matchFetiche = rng() < 0.5 ? feticheNumbers[0] : feticheNumbers[1];
        const winIndex = Math.floor(rng() * 6);
        const cells = Array.from({ length: 6 }, (_, idx) => {
          if (idx === winIndex) {
            return { num: matchFetiche, amountCents: rewardCents, isMatch: true };
          }
          return {
            num: nonMatches[idx],
            amountCents: decoyAmounts[idx % decoyAmounts.length],
            isMatch: false,
          };
        });
        return {
          mechanic: 'fetiche_numbers',
          rewardCents,
          isWin: true,
          feticheNumbers,
          cells,
        };
      }

      return {
        mechanic: 'fetiche_numbers',
        rewardCents: 0,
        isWin: false,
        feticheNumbers,
        cells: nonMatches.map((num, idx) => ({
          num,
          amountCents: decoyAmounts[idx % decoyAmounts.length],
          isMatch: false,
        })),
      };
    }

    case 'celestial_signs': {
      const shuffledSigns = pickShuffled(CELESTIAL_SYMBOLS, rng);
      const masterSign = shuffledSigns[0];
      const others = shuffledSigns.slice(1);
      const decoyGain = pickShuffled([10, 20, 50, 100], rng)[0];

      if (isWin) {
        const orbsRaw: Array<ScratchSymbol & { isMatch: boolean }> = [
          { ...masterSign, isMatch: true },
          { ...masterSign, isMatch: true },
          { ...others[0], isMatch: false },
          { ...others[1], isMatch: false },
        ];
        return {
          mechanic: 'celestial_signs',
          rewardCents,
          isWin: true,
          masterSign,
          orbs: pickShuffled(orbsRaw, rng),
          gainCents: rewardCents,
        };
      }

      const includeNearMiss = rng() < 0.55;
      const orbsRaw: Array<ScratchSymbol & { isMatch: boolean }> = includeNearMiss
        ? [
            { ...masterSign, isMatch: true },
            { ...others[0], isMatch: false },
            { ...others[1], isMatch: false },
            { ...others[2], isMatch: false },
          ]
        : [
            { ...others[0], isMatch: false },
            { ...others[1], isMatch: false },
            { ...others[2], isMatch: false },
            { ...others[3], isMatch: false },
          ];
      return {
        mechanic: 'celestial_signs',
        rewardCents: 0,
        isWin: false,
        masterSign,
        orbs: pickShuffled(orbsRaw, rng),
        gainCents: decoyGain,
      };
    }

    case 'duel_match': {
      const key = definition?.illustrationKey ?? '';
      const playerLabel =
        key === 'compass'
          ? 'Votre Navire'
          : key === 'sword'
            ? 'Votre Lame'
            : key === 'flame'
              ? 'Votre Flamme'
              : 'Votre Score';
      const opponentLabel =
        key === 'compass'
          ? 'Corsaire'
          : key === 'dragon'
            ? 'Dragon'
            : key === 'sword'
              ? 'Gardien'
              : 'Adversaire';

      const winIndex = isWin ? Math.floor(rng() * 3) : -1;
      const decoyAmounts = pickShuffled([5, 10, 20, 50, 100], rng);
      const duels = [0, 1, 2].map((idx) => {
        if (idx === winIndex) {
          const pScore = 4 + Math.floor(rng() * 6); // 4..9
          const oScore = Math.max(1, pScore - (1 + Math.floor(rng() * 3)));
          return {
            roundLabel: `Manche ${idx + 1}`,
            playerScore: pScore,
            opponentScore: oScore,
            amountCents: rewardCents,
            isWin: true,
          };
        }
        const pScore = 1 + Math.floor(rng() * 5); // 1..5
        const oScore = pScore + 1 + Math.floor(rng() * 3);
        return {
          roundLabel: `Manche ${idx + 1}`,
          playerScore: pScore,
          opponentScore: oScore,
          amountCents: decoyAmounts[idx % decoyAmounts.length],
          isWin: false,
        };
      });

      return {
        mechanic: 'duel_match',
        rewardCents,
        isWin,
        playerLabel,
        opponentLabel,
        duels,
      };
    }

    case 'trio_symbols': {
      const key = definition?.illustrationKey ?? 'diamond';
      const palette = pickShuffled(
        TRIO_SYMBOLS_BY_KEY[key] ?? TRIO_SYMBOLS_BY_KEY.diamond,
        rng,
      );
      const rotations = Math.floor(rng() * 4);
      const flipH = rng() < 0.5;
      // Verified bases:
      // Losing: [0,0,1, 1,2,0, 2,1,3] has 0 three-in-a-row alignments
      // Winning: [0,0,0, 1,2,0, 2,1,3] has exactly 1 alignment (top row)
      const baseTemplate = isWin ? [0, 0, 0, 1, 2, 0, 2, 1, 3] : [0, 0, 1, 1, 2, 0, 2, 1, 3];
      const transformed = transform3x3(baseTemplate, rotations, flipH);
      const grid = transformed.map((idx) => palette[idx]);
      const lines = findTrioWinningLines(grid);
      const decoyGain = pickShuffled([10, 20, 50, 100], rng)[0];

      return {
        mechanic: 'trio_symbols',
        rewardCents,
        isWin,
        grid,
        winningLine: isWin ? (lines[0] ?? null) : null,
        gainCents: isWin ? rewardCents : decoyGain,
      };
    }

    case 'treasure_cascade': {
      const key = definition?.illustrationKey ?? 'pyramid';
      const set = CASCADE_SYMBOLS_BY_KEY[key] ?? CASCADE_SYMBOLS_BY_KEY.pyramid;
      const targetSymbol = set[0];
      const decoys = pickShuffled(set.slice(1), rng);
      const decoyAmounts = pickShuffled(DECOY_CENTS, rng);

      if (isWin) {
        let multiplier: 1 | 2 | 5 = 1;
        if (rewardCents >= 5 && rewardCents % 5 === 0 && rng() < 0.35) {
          multiplier = 5;
        } else if (rewardCents >= 2 && rewardCents % 2 === 0 && rng() < 0.55) {
          multiplier = 2;
        }
        const baseCents = Math.round(rewardCents / multiplier);
        const rawRelics = [
          { ...targetSymbol, amountCents: baseCents, isMatch: true },
          { ...decoys[0], amountCents: decoyAmounts[0], isMatch: false },
          { ...decoys[1], amountCents: decoyAmounts[1], isMatch: false },
          { ...decoys[2], amountCents: decoyAmounts[2], isMatch: false },
        ];
        return {
          mechanic: 'treasure_cascade',
          rewardCents,
          isWin: true,
          targetSymbol,
          multiplier,
          relics: pickShuffled(rawRelics, rng),
        };
      }

      const loseMultOptions: Array<1 | 2 | 5> = [1, 2, 5];
      const loseMult = loseMultOptions[Math.floor(rng() * loseMultOptions.length)];
      const loseRelics = [0, 1, 2, 3].map((i) => ({
        ...decoys[i % decoys.length],
        amountCents: decoyAmounts[i % decoyAmounts.length],
        isMatch: false,
      }));
      return {
        mechanic: 'treasure_cascade',
        rewardCents: 0,
        isWin: false,
        targetSymbol,
        multiplier: loseMult,
        relics: loseRelics,
      };
    }
  }
}
