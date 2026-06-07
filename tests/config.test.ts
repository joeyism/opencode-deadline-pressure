import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveOptions } from "../src/config.js";
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("config", () => {
  const testDir = join(tmpdir(), `deadline-test-${Date.now()}`);

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("resolves default options", () => {
    const opts = resolveOptions();
    expect(opts.budgetMs).toBe(2400000);
    expect(opts.thresholds).toHaveLength(3);
    expect(opts.thresholds[0].percent).toBe(50);
    expect(opts.thresholds[1].percent).toBe(75);
    expect(opts.thresholds[2].percent).toBe(90);
    expect(opts.startTime).toBeLessThanOrEqual(Date.now());
  });

  it("resolves custom options", () => {
    const opts = resolveOptions({ budgetMs: 1000, thresholds: [{ percent: 80, severity: "warning", message: "test", blocking: true }] });
    expect(opts.budgetMs).toBe(1000);
    expect(opts.thresholds).toHaveLength(1);
  });

  it("writes sentinel file on first init", () => {
    const opts = resolveOptions({}, testDir);
    const sentinelPath = join(testDir, ".opencode-deadline-start");
    expect(existsSync(sentinelPath)).toBe(true);
    expect(parseInt(readFileSync(sentinelPath, "utf-8"))).toBe(opts.startTime);
  });

  it("reads sentinel file on subsequent init", () => {
    const sentinelPath = join(testDir, ".opencode-deadline-start");
    const oldTime = Date.now() - 10000;
    writeFileSync(sentinelPath, String(oldTime), "utf-8");

    const opts = resolveOptions({}, testDir);
    expect(opts.startTime).toBe(oldTime);
  });

  it("ignores corrupt sentinel file and overwrites", () => {
    const sentinelPath = join(testDir, ".opencode-deadline-start");
    writeFileSync(sentinelPath, "garbage", "utf-8");

    const opts = resolveOptions({}, testDir);
    expect(opts.startTime).not.toBeNaN();
    expect(readFileSync(sentinelPath, "utf-8")).toBe(String(opts.startTime));
  });

  it("handles readonly directory gracefully", () => {
    // Mock writeFileSync to throw
    const fs = require("fs");
    const originalWrite = fs.writeFileSync;
    fs.writeFileSync = vi.fn().mockImplementation(() => { throw new Error("readonly"); });

    try {
      const opts = resolveOptions({}, "/non-existent-dir");
      expect(opts.startTime).toBeLessThanOrEqual(Date.now());
    } finally {
      fs.writeFileSync = originalWrite;
    }
  });
});
