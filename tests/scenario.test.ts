import { describe, it, expect } from "vitest";
import { runScenario, formatReport } from "../packages/player-sim/src/scenario";

describe("Scenario runner", () => {
  it("vod_good_net passes QoE checks", () => {
    const res = runScenario("configs/scenarios/vod_good_net.json");
    console.log("\n" + formatReport(res)); // inspect output locally if needed
    expect(res.qoe.overallPass).toBe(true);
  });

  it("vod_verypoor_inline meets lenient thresholds", () => {
    const res = runScenario("configs/scenarios/vod_verypoor_inline.json");
    console.log("\n" + formatReport(res));
    expect(res.qoe.overallPass).toBe(true);
  });
});
