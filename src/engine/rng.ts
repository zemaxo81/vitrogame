export function secureRandom(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
  }
  return Math.random();
}

export function generateUid(prefix = 'vc'): string {
  const rand = Math.floor(secureRandom() * 0xffffffff)
    .toString(36)
    .padStart(7, '0');
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

export function formatCents(cents: number): string {
  return formatEuro(cents / 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export interface WeightedItem {
  probability: number;
}

/**
 * Picks one item using weighted probabilities (in basis points to prevent float drift).
 */
export function rollWeighted<T extends WeightedItem>(items: T[], randFn: () => number = secureRandom): T {
  if (items.length === 0) {
    throw new Error('Cannot roll from empty weighted list');
  }
  const weights = items.map((item) => Math.max(0, Math.round(item.probability * 1000)));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  if (totalWeight <= 0) {
    return items[0];
  }
  const target = randFn() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (target < cumulative) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

export function shuffleArray<T>(list: T[], randFn: () => number = secureRandom): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
