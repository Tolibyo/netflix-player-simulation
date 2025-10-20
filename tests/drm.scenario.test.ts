import { describe, it, expect } from "vitest";
import { runScenario } from "../packages/player-sim/src/scenario";

describe("Scenario + DRM integration", () => {
  it("passes and records startup when DRM allowed", () => {
    const r = runScenario("configs/scenarios/vod_good_net_drm_ok.json");
    expect(r.qoe.overallPass).toBe(true); // thresholds ignore startup by design here
    expect((r.telemetry.startupTimeMs ?? 0)).toBeGreaterThanOrEqual(450);
  });

  it("throws when DRM blocks the device", () => {
    expect(() => runScenario("configs/scenarios/vod_good_net_drm_blocked.json"))
      .toThrow(/DRM: device "Mid Browser" not permitted/);
  });
});
