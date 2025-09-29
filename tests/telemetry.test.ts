import { describe, it, expect } from "vitest";
import { Telemetry } from "../packages/player-sim/src/telemetry";

describe("Telemetry", () => {
  it("records startup time", () => {
    const t = new Telemetry();
    t.setStartupTime(850);
    expect(t.snapshot().startupTimeMs).toBe(850);
  });

  it("tracks rebuffer events and total time; clamps negatives", () => {
    const t = new Telemetry();
    t.addRebuffer(300);
    t.addRebuffer(-50); // should count an event but add 0 time
    expect(t.snapshot().rebufferEvents).toBe(2);
    expect(t.snapshot().rebufferTimeMs).toBe(300);
  });

  it("computes avg bitrate only after valid samples", () => {
    const t = new Telemetry();
    expect(t.snapshot().avgBitrateKbps).toBeNull();
    t.noteBitrate(800);
    t.noteBitrate(2500);
    t.noteBitrate(5000);
    expect(t.snapshot().avgBitrateKbps).toBe(Math.round((800 + 2500 + 5000) / 3));
  });

  it("increments quality switches", () => {
    const t = new Telemetry();
    t.addQualitySwitch();
    t.addQualitySwitch();
    expect(t.snapshot().qualitySwitches).toBe(2);
  });

  it("reset clears all metrics", () => {
    const t = new Telemetry();
    t.setStartupTime(700);
    t.addRebuffer(1000);
    t.noteBitrate(2000);
    t.addQualitySwitch();
    t.reset();
    expect(t.snapshot()).toEqual(expect.objectContaining({
      startupTimeMs: null,
      rebufferEvents: 0,
      rebufferTimeMs: 0,
      avgBitrateKbps: null,
      qualitySwitches: 0,
      adImpressions: 0,
      adSeamGapMs: 0
    }));
  });
});
