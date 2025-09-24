import { describe, it, expect } from "vitest";
import { assertQoE, loadThresholds, type QoEThresholds } from "../packages/player-sim/src/assertions";

const BASE_SNAPSHOT = {
  startupTimeMs: 1000,
  rebufferEvents: 1,
  rebufferTimeMs: 1500,
  avgBitrateKbps: 2000,
  qualitySwitches: 3
};

describe("assertQoE()", () => {
  it("passes when all metrics within bounds", () => {
    const th: QoEThresholds = {
      maxStartupMs: 1500,
      maxRebufferTimeMs: 2000,
      maxRebufferEvents: 2,
      minAvgBitrateKbps: 1000,
      maxQualitySwitches: 5
    };
    const res = assertQoE(BASE_SNAPSHOT, th);
    expect(res.overallPass).toBe(true);
    expect(res.checks.every(c => c.pass)).toBe(true);
  });

  it("fails when a metric exceeds its max", () => {
    const th: QoEThresholds = { maxRebufferTimeMs: 1000 }; // too strict
    const res = assertQoE(BASE_SNAPSHOT, th);
    expect(res.overallPass).toBe(false);
    const rebuf = res.checks.find(c => c.name.includes("rebufferTimeMs"));
    expect(rebuf?.pass).toBe(false);
  });

  it("fails when a metric is below its min", () => {
    const th: QoEThresholds = { minAvgBitrateKbps: 5000 }; // too high
    const res = assertQoE(BASE_SNAPSHOT, th);
    expect(res.overallPass).toBe(false);
    const avg = res.checks.find(c => c.name.includes("avgBitrateKbps"));
    expect(avg?.pass).toBe(false);
  });

  it("skips checks that are undefined in thresholds", () => {
    const th: QoEThresholds = { maxStartupMs: 1200 }; // only startup bound
    const res = assertQoE(BASE_SNAPSHOT, th);
    expect(res.overallPass).toBe(true);
    // Only one check recorded
    expect(res.checks.length).toBe(1);
  });

  it("fails when threshold exists but metric is null", () => {
    const snap = { ...BASE_SNAPSHOT, startupTimeMs: null as number | null };
    const th: QoEThresholds = { maxStartupMs: 2000 };
    const res = assertQoE(snap, th);
    expect(res.overallPass).toBe(false);
    const s = res.checks.find(c => c.name.includes("startupTimeMs"));
    expect(s?.reason).toBe("metric is null but threshold provided");
  });
});

describe("loadThresholds()", () => {
  it("reads thresholds from JSON file", () => {
    const th = loadThresholds("configs/qoe-thresholds.json");
    expect(typeof th).toBe("object");
    expect(Object.keys(th).length).toBeGreaterThan(0);
  });
});
