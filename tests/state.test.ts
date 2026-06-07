import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createState, checkDeadline, formatDuration } from "../src/state.js";
import { resolveOptions } from "../src/config.js";

describe("state", () => {
  it("creates initial state", () => {
    const state = createState(resolveOptions());
    expect(state.stepCount).toBe(0);
    expect(state.firedThresholds.size).toBe(0);
    expect(state.pendingWarning).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats correctly", () => {
    expect(formatDuration(45000)).toBe("45s");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(1350000)).toBe("22m 30s");
    expect(formatDuration(-1000)).toBe("0s");
  });
});

describe("checkDeadline", () => {
  let startTime: number;

  beforeEach(() => {
    vi.useFakeTimers();
    startTime = Date.now();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires 50% threshold", () => {
    const state = createState(resolveOptions({ budgetMs: 1000 }));
    state.options.startTime = startTime;
    
    vi.advanceTimersByTime(500); // 50%
    checkDeadline(state);
    
    expect(state.firedThresholds.has(50)).toBe(true);
    expect(state.pendingWarning).toContain("50%");
    expect(state.pendingBlocking).toBe(false);
  });

  it("does not re-fire a threshold", () => {
    const state = createState(resolveOptions({ budgetMs: 1000 }));
    state.options.startTime = startTime;
    
    vi.advanceTimersByTime(500);
    checkDeadline(state);
    state.pendingWarning = null; // Clear it
    
    vi.advanceTimersByTime(20); // 52%
    checkDeadline(state);
    expect(state.pendingWarning).toBeNull(); // Should not re-fire
  });

  it("fires multiple thresholds if jumped", () => {
    const state = createState(resolveOptions({ budgetMs: 1000 }));
    state.options.startTime = startTime;
    
    vi.advanceTimersByTime(950); // Jumped past 50%, 75%, 90%
    checkDeadline(state);
    
    expect(state.firedThresholds.has(50)).toBe(true);
    expect(state.firedThresholds.has(75)).toBe(true);
    expect(state.firedThresholds.has(90)).toBe(true);
    // pendingWarning should be the last one (90% critical)
    expect(state.pendingWarning).toContain("CRITICAL");
    expect(state.pendingBlocking).toBe(true);
  });

  it("does not fire below threshold", () => {
    const state = createState(resolveOptions({ budgetMs: 1000 }));
    state.options.startTime = startTime;
    
    vi.advanceTimersByTime(400); // 40%
    checkDeadline(state);
    
    expect(state.firedThresholds.size).toBe(0);
    expect(state.pendingWarning).toBeNull();
  });
});
