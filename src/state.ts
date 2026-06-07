import type { PluginState, ResolvedOptions } from "./types.js";

export function createState(options: ResolvedOptions): PluginState {
  return {
    options,
    firedThresholds: new Set(),
    pendingWarning: null,
    pendingBlocking: false,
    investigationLockdown: false,
    fullLockdown: false,
    stepCount: 0,
  };
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function checkDeadline(state: PluginState): void {
  const { budgetMs, startTime, thresholds } = state.options;
  const now = Date.now();
  const elapsedMs = now - startTime;
  const percentUsed = (elapsedMs / budgetMs) * 100;
  const remainingMs = Math.max(0, budgetMs - elapsedMs);

  // Sort thresholds ascending so we fire them in order
  const sorted = [...thresholds].sort((a, b) => a.percent - b.percent);

  for (const threshold of sorted) {
    if (percentUsed >= threshold.percent && !state.firedThresholds.has(threshold.percent)) {
      state.firedThresholds.add(threshold.percent);

      const message = threshold.message
        .replace("{percent}", Math.round(percentUsed).toString())
        .replace("{elapsed}", formatDuration(elapsedMs))
        .replace("{remaining}", formatDuration(remainingMs));

      const prefix = threshold.severity === "critical" ? "🚨" : threshold.severity === "warning" ? "⚠️" : "ℹ️";
      state.pendingWarning = `${prefix} DEADLINE PRESSURE ${threshold.severity.toUpperCase()}: ${message}`;
      state.pendingBlocking = threshold.blocking ?? false;
      
      if (threshold.investigationLockdown) {
        state.investigationLockdown = true;
      }
      if (threshold.fullLockdown) {
        state.fullLockdown = true;
      }
    }
  }
}
