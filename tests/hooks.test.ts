import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createHooks } from "../src/hooks.js";
import { createState } from "../src/state.js";
import { resolveOptions } from "../src/config.js";

describe("hooks", () => {
  let state: any;
  let hooks: any;
  let ctx: any;
  let startTime: number;

  beforeEach(() => {
    vi.useFakeTimers();
    startTime = Date.now();
    state = createState(resolveOptions({ budgetMs: 1000 }));
    state.options.startTime = startTime;
    ctx = { worktree: "/mock" };
    hooks = createHooks(ctx, state);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("injects non-blocking warning into tool output", async () => {
    // Trigger 50% threshold
    vi.advanceTimersByTime(500);
    await hooks.event({ event: { type: "message.part.updated", part: { type: "step-finish" } } });

    expect(state.pendingWarning).not.toBeNull();

    const output = { output: "some result", metadata: {} };
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s", callID: "c" },
      output
    );
    expect(output.output).toContain("DEADLINE PRESSURE");
    expect(output.output).toContain("50%");
    expect(state.pendingWarning).toBeNull();
  });

  it("throws blocking warning for critical threshold", async () => {
    // Trigger 90% threshold
    vi.advanceTimersByTime(950);
    await hooks.event({ event: { type: "message.part.updated", part: { type: "step-finish" } } });

    await expect(
      hooks["tool.execute.before"]({ tool: "bash", sessionID: "s", callID: "c" }, { args: {} })
    ).rejects.toThrow("DEADLINE PRESSURE CRITICAL");
  });

  it("does not block write calls even at critical threshold", async () => {
    // Trigger 90% threshold
    vi.advanceTimersByTime(950);
    await hooks.event({ event: { type: "message.part.updated", part: { type: "step-finish" } } });

    // Should NOT throw for write
    await expect(
      hooks["tool.execute.before"]({ tool: "write", sessionID: "s", callID: "c" }, { args: { filePath: "f.c" } })
    ).resolves.not.toThrow();

    expect(state.pendingBlocking).toBe(false);
    expect(state.pendingWarning).not.toBeNull();

    // Should inject warning in after hook
    const output = { output: "wrote", metadata: {} };
    await hooks["tool.execute.after"]({ tool: "write" }, output);
    expect(output.output).toContain("DEADLINE PRESSURE CRITICAL");
  });

  it("does not block edit calls even at critical threshold", async () => {
    // Trigger 90% threshold
    vi.advanceTimersByTime(950);
    await hooks.event({ event: { type: "message.part.updated", part: { type: "step-finish" } } });

    // Should NOT throw for edit
    await expect(
      hooks["tool.execute.before"]({ tool: "edit", sessionID: "s", callID: "c" }, { args: { path: "f.c" } })
    ).resolves.not.toThrow();

    expect(state.pendingBlocking).toBe(false);
  });

  it("ignores non-step-finish events", async () => {
    await hooks.event({ event: { type: "session.status" } });
    expect(state.stepCount).toBe(0);
  });

  it("does not inject when no warning pending", async () => {
    const output = { output: "clean", metadata: {} };
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s", callID: "c" },
      output
    );
    expect(output.output).toBe("clean");
  });
});
