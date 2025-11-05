import { describe, it, expect } from "vitest";
import { runScenario, formatReport } from "../packages/player-sim/src/scenario";

describe("Scenario runner", () => {
  it("vod_good_net passes QoE checks", () => {
    const res = runScenario("configs/scenarios/vod_good_net.json");
    console.log("\n" + formatReport(res));
    expect(res.qoe.overallPass).toBe(true);
  });

  // This scenario is intentionally harsh: we EXPECT QoE to fail.
  it("vod_verypoor_inline fails QoE as expected under very poor network", () => {
    const res = runScenario("configs/scenarios/vod_verypoor_inline.json");
    console.log("\n" + formatReport(res));

    // Overall gate must fail for this scenario
    expect(res.qoe.overallPass).toBe(false);

    // And specifically: the rebufferTimeMs check should be the one failing
    const rebufferCheck = res.qoe.checks.find(
      (c) => c.name.includes("rebufferTimeMs")
    );
    expect(rebufferCheck?.pass).toBe(false);
  });
});
