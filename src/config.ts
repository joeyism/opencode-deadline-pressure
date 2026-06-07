import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { DeadlinePressureOptions, ResolvedOptions, ThresholdConfig } from "./types.js";

const SENTINEL_FILENAME = ".opencode-deadline-start";

function resolveStartTime(directory: string): number {
  const sentinelPath = join(directory, SENTINEL_FILENAME);
  try {
    const content = readFileSync(sentinelPath, "utf-8").trim();
    const parsed = parseInt(content, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    // Ignore read errors
  }

  const now = Date.now();
  try {
    writeFileSync(sentinelPath, String(now), "utf-8");
  } catch {
    // Best-effort
  }
  return now;
}

const DEFAULT_THRESHOLDS: ThresholdConfig[] = [
  {
    percent: 20,
    severity: "info",
    message: "You've used {percent}% of your time budget ({elapsed} elapsed, ~{remaining} remaining). You should be writing your solution file soon.",
    blocking: false,
  },
  {
    percent: 33,
    severity: "warning",
    message: "INVESTIGATION PHASE OVER: {percent}% of budget used ({elapsed} elapsed, ~{remaining} remaining). Diagnostic scripts and exploration commands are no longer permitted. You must write, compile, and test from this point forward. Use your best guess for any unknowns — a working but imperfect solution scores higher than no solution at all.",
    blocking: false,
    investigationLockdown: true,
  },
  {
    percent: 75,
    severity: "critical",
    message: "CRITICAL: {percent}% of time budget consumed ({elapsed} elapsed, ~{remaining} remaining). You MUST stop iterating and finalize your solution immediately. Only write/edit tools are permitted from this point forward.",
    blocking: true,
    fullLockdown: true,
  },
];

export function resolveOptions(
  options?: DeadlinePressureOptions,
  directory?: string
): ResolvedOptions {
  const startTime = directory ? resolveStartTime(directory) : Date.now();
  return {
    budgetMs: options?.budgetMs ?? 2400000, // Default to 40 minutes (2400000 ms)
    startTime,
    thresholds: options?.thresholds ?? DEFAULT_THRESHOLDS,
  };
}
