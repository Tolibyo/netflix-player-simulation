import fs from "fs";
import { describe, it, expect } from "vitest";
import { writeJsonReport } from "../packages/player-sim/src/reporter/jsonReporter";

describe("JSON Reporter", () => {
  const mockResult = {
    name: "test_scenario",
    ended: true,
    telemetry: {
      startupTimeMs: 0,
      rebufferEvents: 0,
      rebufferTimeMs: 0,
      avgBitrateKbps: 1000,
      qualitySwitches: 1
    },
    qoe: { overallPass: true, checks: [] }
  };

  it("writes a structured JSON file", () => {
    const p = writeJsonReport(mockResult as any, "tmp_reports");
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    expect(data.scenario).toBe("test_scenario");
    expect(data.telemetry.avgBitrateKbps).toBe(1000);
    expect(data.qoe.overallPass).toBe(true);
  });
});
