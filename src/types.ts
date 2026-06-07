export interface DeadlinePressureOptions {
  budgetMs?: number;              // Total time budget in ms (e.g. 2400000 for 40min)
  thresholds?: ThresholdConfig[];
}

export interface ThresholdConfig {
  percent: number;               // e.g. 50, 75, 90
  severity: "info" | "warning" | "critical";
  message: string;               // Template with {percent}, {elapsed}, {remaining}
  blocking?: boolean;            // Whether to throw (block next tool) or just append
  investigationLockdown?: boolean; // NEW: Block only 'investigate' bash intent
  fullLockdown?: boolean;          // NEW: Block all non-write tools
}

export interface ResolvedOptions {
  budgetMs: number;
  startTime: number;            // Date.now() at plugin init
  thresholds: ThresholdConfig[];
}

export interface PluginState {
  options: ResolvedOptions;
  firedThresholds: Set<number>;
  pendingWarning: string | null;
  pendingBlocking: boolean;
  investigationLockdown: boolean;
  fullLockdown: boolean;
  stepCount: number;
}
