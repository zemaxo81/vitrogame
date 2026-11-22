import { createDefaultConfig, createInitialAppState, createInitialTicketsCatalog, SCHEMA_VERSION } from '../data/defaults';
import { appendAdminAudit } from '../engine/rewards';
import { resolveTicketMechanic } from '../engine/scratchBoard';
import { AppState, BackupEnvelope } from '../types/vitrocash';

const DB_NAME = 'vitrocash_local_db';
const STORE_NAME = 'kv_store';
const STATE_KEY = 'app_state_v1';
const LS_FALLBACK_KEY = 'vitrocash_state_mirror_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'));
    }, 1500);

    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        reject(req.error ?? new Error('IndexedDB open error'));
      };
      req.onblocked = () => {
        clearTimeout(timer);
        reject(new Error('IndexedDB blocked'));
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

export async function loadPersistedState(): Promise<AppState | null> {
  try {
    const db = await openDb();
    const idbData = await new Promise<AppState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(STATE_KEY);
      getReq.onsuccess = () => resolve((getReq.result as AppState | undefined) ?? null);
      getReq.onerror = () => reject(getReq.error);
    });
    if (idbData && typeof idbData === 'object') {
      return hydrateMissingFields(idbData);
    }
  } catch {
    // Fallback to localStorage mirror
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return hydrateMissingFields(parsed);
    }
  } catch {
    // Corrupted or empty
  }
  return null;
}

export async function savePersistedState(state: AppState): Promise<void> {
  // Always update synchronous mirror first for crash resilience
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota warnings on mirror
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(state, STATE_KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch {
    // localStorage mirror already wrote
  }
}

export function savePersistedStateSync(state: AppState): void {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

function hydrateMissingFields(raw: Partial<AppState>): AppState {
  const base = createInitialAppState();
  const defCfg = createDefaultConfig();
  const rawCatalog =
    Array.isArray(raw.ticketsCatalog) && raw.ticketsCatalog.length > 0
      ? raw.ticketsCatalog.map((t) => ({
          ...t,
          mechanic: resolveTicketMechanic(t),
        }))
      : createInitialTicketsCatalog();
  return {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    creditedEventIds: Array.isArray(raw.creditedEventIds) ? Array.from(new Set(raw.creditedEventIds)) : [],
    ticketsCatalog: rawCatalog,
    milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    adminAudit: Array.isArray(raw.adminAudit) ? raw.adminAudit : [],
    lotteryDraws: raw.lotteryDraws && typeof raw.lotteryDraws === 'object' ? raw.lotteryDraws : {},
    config: {
      general: { ...defCfg.general, ...(raw.config?.general ?? {}) },
      tickets: { ...defCfg.tickets, ...(raw.config?.tickets ?? {}) },
      wheel: { ...defCfg.wheel, ...(raw.config?.wheel ?? {}) },
      slots: { ...defCfg.slots, ...(raw.config?.slots ?? {}) },
      lottery: { ...defCfg.lottery, ...(raw.config?.lottery ?? {}) },
      stopwatch: { ...defCfg.stopwatch, ...(raw.config?.stopwatch ?? {}) },
      milestones: { ...defCfg.milestones, ...(raw.config?.milestones ?? {}) },
      appearance: { ...defCfg.appearance, ...(raw.config?.appearance ?? {}) },
      sounds: { ...defCfg.sounds, ...(raw.config?.sounds ?? {}) },
      animations: { ...defCfg.animations, ...(raw.config?.animations ?? {}) },
      splash: { ...defCfg.splash, ...(raw.config?.splash ?? {}) },
      security: { ...defCfg.security, ...(raw.config?.security ?? {}) },
    },
  };
}

/**
 * Deterministic FNV-1a + length checksum for offline integrity verification of exported backups.
 */
export function computeIntegrityChecksum(payload: unknown): string {
  const str = JSON.stringify(payload);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}-${(h2 >>> 0).toString(16).padStart(8, '0')}-${str.length}`;
}

export function createBackupEnvelope(state: AppState, now = Date.now()): {
  envelope: BackupEnvelope;
  nextState: AppState;
} {
  const updatedState = appendAdminAudit(
    { ...state, lastBackupAt: now },
    'BACKUP_EXPORTED',
    'Sauvegardes',
    'Sauvegarde complète exportée',
    { historyCount: state.history.length, ticketsCount: state.ticketsCatalog.length },
    now,
  );
  const checksum = computeIntegrityChecksum(updatedState);
  return {
    envelope: {
      app: 'VITROCASH',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now,
      checksum,
      state: updatedState,
    },
    nextState: updatedState,
  };
}

export function parseAndVerifyBackup(rawJson: string): {
  valid: boolean;
  error?: string;
  state?: AppState;
  exportedAt?: number;
} {
  try {
    const parsed = JSON.parse(rawJson) as BackupEnvelope;
    if (!parsed || parsed.app !== 'VITROCASH' || !parsed.state || typeof parsed.checksum !== 'string') {
      return { valid: false, error: 'Format de fichier invalide : ce fichier n\'est pas une sauvegarde VITROCASH.' };
    }
    const expected = computeIntegrityChecksum(parsed.state);
    if (expected !== parsed.checksum) {
      return {
        valid: false,
        error: 'Échec de vérification d\'intégrité : la sauvegarde a été modifiée ou corrompue.',
      };
    }
    const hydrated = hydrateMissingFields(parsed.state);
    // Deduplicate creditedEventIds and history entries by id
    const seenHist = new Set<string>();
    const dedupedHistory = hydrated.history.filter((h) => {
      if (seenHist.has(h.id)) return false;
      seenHist.add(h.id);
      return true;
    });

    return {
      valid: true,
      exportedAt: parsed.exportedAt,
      state: {
        ...hydrated,
        creditedEventIds: Array.from(new Set(hydrated.creditedEventIds)),
        history: dedupedHistory,
      },
    };
  } catch {
    return { valid: false, error: 'Impossible de lire le JSON de sauvegarde.' };
  }
}

/**
 * Exact implementation of:
 * "RÉINITIALISATION TOTALE DES DONNÉES DE TEST"
 * Resets balances, histories, attempt counters, stopwatch progress, stats, milestones, game gains.
 * Preserves: 25+ tickets, artworks & configs, wheel/slot/lottery settings, schedule, stopwatch & milestone settings,
 * general settings, admin code, design, sounds, animations, splash screen.
 */
export function executeTotalTestDataReset(state: AppState, now = Date.now()): AppState {
  const cfg = state.config;
  const fresh = createInitialAppState(now, '');
  const preservedState: AppState = {
    ...fresh,
    ticketsCatalog: state.ticketsCatalog,
    config: cfg,
    lastBackupAt: state.lastBackupAt,
    ticketQuota: {
      remaining: cfg.tickets.batchSize,
      maxAttempts: cfg.tickets.batchSize,
      intervalHours: cfg.tickets.intervalHours,
      renewalMode: cfg.tickets.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        cfg.tickets.renewalMode === 'FIXED_INTERVAL'
          ? now + cfg.tickets.intervalHours * 3600_000
          : null,
      lastRenewalId: `tk-reset-${now}`,
    },
    wheelQuota: {
      remaining: cfg.wheel.maxSpins,
      maxAttempts: cfg.wheel.maxSpins,
      intervalHours: cfg.wheel.intervalHours,
      renewalMode: cfg.wheel.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        cfg.wheel.renewalMode === 'FIXED_INTERVAL'
          ? now + cfg.wheel.intervalHours * 3600_000
          : null,
      lastRenewalId: `wh-reset-${now}`,
    },
    slotQuota: {
      remaining: cfg.slots.maxSpins,
      maxAttempts: cfg.slots.maxSpins,
      intervalHours: cfg.slots.intervalHours,
      renewalMode: cfg.slots.renewalMode,
      periodStartedAt: now,
      cooldownStartedAt: null,
      nextRenewalAt:
        cfg.slots.renewalMode === 'FIXED_INTERVAL'
          ? now + cfg.slots.intervalHours * 3600_000
          : null,
      lastRenewalId: `sl-reset-${now}`,
    },
  };

  return appendAdminAudit(
    preservedState,
    'TOTAL_TEST_DATA_RESET',
    'Réinitialisation',
    'RÉINITIALISATION TOTALE DES DONNÉES DE TEST effectuée (catalogue et paramètres conservés)',
    undefined,
    now,
  );
}

/**
 * Restores default parameters WITHOUT deleting histories, balances, or fictitious credits.
 */
export function restoreDefaultParametersOnly(state: AppState, now = Date.now()): AppState {
  const defCfg = createDefaultConfig();
  const next: AppState = {
    ...state,
    config: {
      ...defCfg,
      security: state.config.security, // Keep admin code or let user change it separately? Let's restore defaults except preserve balances/history!
    },
  };
  return appendAdminAudit(
    next,
    'RESTORE_DEFAULT_PARAMS',
    'Réinitialisation',
    'Paramètres par défaut restaurés (historiques et crédits fictifs conservés)',
    undefined,
    now,
  );
}
