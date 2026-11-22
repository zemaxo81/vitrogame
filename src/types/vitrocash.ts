export type ActivityKey = 'tickets' | 'wheel' | 'slots' | 'lottery';
export type HistoryCategory = ActivityKey | 'stopwatch' | 'milestone' | 'admin';
export type RenewalMode = 'AFTER_CONSUMPTION' | 'FIXED_INTERVAL';
export type CoinModelId = 'imperial_gold' | 'electric_diamond' | 'violet_crystal' | 'platinum_eclipse';

export interface ProbabilityTier {
  id: string;
  amount: number; // in fictitious EUR
  probability: number; // percentage 0..100
  label?: string;
  color?: string;
}

export type TicketStatus = 'active' | 'inactive' | 'archived';

export type TicketMechanic =
  | 'vault_duo'
  | 'fetiche_numbers'
  | 'celestial_signs'
  | 'duel_match'
  | 'trio_symbols'
  | 'treasure_cascade';

export interface TicketDefinition {
  id: string;
  name: string;
  theme: string;
  description: string;
  illustrationKey: string;
  mechanic?: TicketMechanic;
  customImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  status: TicketStatus;
  probabilities: ProbabilityTier[];
  createdAt: number;
  updatedAt: number;
  isInitial?: boolean;
}

export interface TicketInstance {
  instanceId: string;
  ticketId: string;
  ticketName: string;
  batchId: string;
  status: 'READY' | 'SCRATCHING' | 'REVEALED';
  rewardAmount: number;
  rewardTierLabel: string;
  createdAt: number;
  scratchedAt?: number;
  creditedEventId?: string;
}

export interface WheelSegment {
  id: string;
  label: string;
  amount: number;
  probability: number;
  color: string;
  textColor: string;
}

export interface SlotSymbol {
  id: string;
  name: string;
  glyph: string;
  color: string;
}

export interface SlotOutcomeTier {
  id: string;
  amount: number;
  probability: number;
  label: string;
}

export interface LotteryDraw {
  drawKey: string; // YYYY-MM-DD in Europe/Paris
  scheduledAt: number; // UTC ms for 20:00 Europe/Paris
  status: 'OPEN' | 'DRAWN';
  playerNumbers?: number[];
  playerComplementary?: number;
  submittedAt?: number;
  winningNumbers?: number[];
  winningComplementary?: number;
  matchedMain?: number[];
  matchedComplementary?: boolean;
  mainPrize?: number;
  bonusPrize?: number;
  totalPrize?: number;
  drawnAt?: number;
  creditedEventId?: string;
  replayedAfterDraw?: boolean;
}

export interface ActivityQuotaState {
  remaining: number;
  maxAttempts: number;
  intervalHours: number;
  renewalMode: RenewalMode;
  periodStartedAt: number;
  cooldownStartedAt: number | null;
  nextRenewalAt: number | null;
  lastRenewalId: string;
}

export interface TicketBatchState {
  batchId: string;
  generatedAt: number;
  items: TicketInstance[];
}

export interface StopwatchState {
  totalActiveSeconds: number;
  sessionActiveSeconds: number;
  lastTickAt: number | null;
  isPaused: boolean;
  pauseReason: string | null;
  awardedThresholds: number[]; // threshold minutes already awarded
}

export interface MilestoneRequest {
  id: string;
  thresholdAmount: number;
  cycleBalanceAtTrigger: number;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  createdAt: number;
  validatedAt?: number;
  message: string;
  note?: string;
}

export interface HistoryEvent {
  id: string;
  category: HistoryCategory;
  title: string;
  description: string;
  amount: number; // positive credit or 0
  timestamp: number;
  details: Record<string, unknown>;
  ticketId?: string;
  ticketName?: string;
  isPositiveOutcome: boolean;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  section: string;
  summary: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface SplashConfig {
  enabled: boolean;
  durationSeconds: number;
  logoSizePx: number;
  logoTopPercent: number;
  coinSizePx: number;
  coinBottomPercent: number;
  rotationSpeedSeconds: number;
  rotationDirection: 'normal' | 'reverse';
  coinModel: CoinModelId;
  glowEnabled: boolean;
  reflectionEnabled: boolean;
}

export interface SoundConfig {
  masterEnabled: boolean;
  volume: number; // 0..1
  ticketsEnabled: boolean;
  wheelEnabled: boolean;
  slotsEnabled: boolean;
  lotteryEnabled: boolean;
  victoryEnabled: boolean;
}

export interface AnimationConfig {
  masterEnabled: boolean;
  intensity: 'subtle' | 'normal' | 'dynamic';
  lightsEnabled: boolean;
  hapticsEnabled: boolean;
  hapticsIntensity: 'light' | 'medium' | 'strong';
  wheelSpinDurationMs: number;
  slotSpinDurationMs: number;
}

export interface AppearanceConfig {
  glowIntensity: 'low' | 'medium' | 'high';
  compactCards: boolean;
  showDisclaimerBanner: boolean;
}

export interface StopwatchConfig {
  trackedActivities: ActivityKey[];
  initialThresholdsMinutes: number[];
  repeatIntervalMinutes: number;
  rewardPerThreshold: number;
  autoPauseIdleSeconds: number;
}

export interface MilestoneConfig {
  thresholdAmount: number;
  pendingMessage: string;
  validatedMessage: string;
  resetCycleOnValidation: boolean;
  allowPlayWhilePending: boolean;
}

export interface LotteryConfig {
  drawHour: number;
  drawMinute: number;
  timezone: string;
  cutoffMinutesBeforeDraw: number;
  maxNumber: number;
  mainPickCount: number;
  prizeScale: Record<number, number>; // matched count -> amount
  complementaryBonus: number;
}

export interface WheelConfig {
  maxSpins: number;
  intervalHours: number;
  renewalMode: RenewalMode;
  segments: WheelSegment[];
}

export interface SlotConfig {
  maxSpins: number;
  intervalHours: number;
  renewalMode: RenewalMode;
  symbols: SlotSymbol[];
  outcomes: SlotOutcomeTier[];
}

export interface TicketsConfig {
  batchSize: number;
  intervalHours: number;
  renewalMode: RenewalMode;
}

export interface SecurityConfig {
  adminCode: string;
  maxFailedAttempts: number;
  lockoutSeconds: number;
}

export interface GeneralConfig {
  appName: string;
  playerName: string;
  welcomeSubtitle: string;
  disclaimerText: string;
}

export interface AppConfig {
  general: GeneralConfig;
  tickets: TicketsConfig;
  wheel: WheelConfig;
  slots: SlotConfig;
  lottery: LotteryConfig;
  stopwatch: StopwatchConfig;
  milestones: MilestoneConfig;
  appearance: AppearanceConfig;
  sounds: SoundConfig;
  animations: AnimationConfig;
  splash: SplashConfig;
  security: SecurityConfig;
}

export interface SecurityLockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
}

export interface AppState {
  schemaVersion: number;
  cycleBalanceCents: number;
  cumulativeTotalCents: number;
  creditedEventIds: string[];
  ticketsCatalog: TicketDefinition[];
  ticketQuota: ActivityQuotaState;
  activeTicketBatch: TicketBatchState | null;
  wheelQuota: ActivityQuotaState;
  slotQuota: ActivityQuotaState;
  lotteryDraws: Record<string, LotteryDraw>;
  currentLotteryKey: string;
  stopwatch: StopwatchState;
  milestones: MilestoneRequest[];
  history: HistoryEvent[];
  adminAudit: AdminAuditEvent[];
  lastBackupAt: number | null;
  securityLockout: SecurityLockoutState;
  config: AppConfig;
}

export interface BackupEnvelope {
  app: 'VITROCASH';
  schemaVersion: number;
  exportedAt: number;
  checksum: string;
  state: AppState;
}
