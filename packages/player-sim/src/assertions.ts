import fs from "fs";
import type { TelemetrySnapshot } from "./telemetry";

export type QoEThresholds = {
  maxStartupMs?: number;
  maxRebufferTimeMs?: number;
  maxRebufferEvents?: number;
  minAvgBitrateKbps?: number;
  maxQualitySwitches?: number;
};

export type Assertion = { name: string; pass: boolean; actual: number | null; expected?: number; reason?: string };
export type AssertionResult = { overallPass: boolean; checks: Assertion[] };

/**
 * Load thresholds JSON from disk (optional helper).
 * Shape must match QoEThresholds (unknown keys are ignored).
 */
export function loadThresholds(path: string): QoEThresholds {
  const raw = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(raw);
  return data as QoEThresholds;
}

/**
 * Compare a Telemetry snapshot against thresholds.
 * - If a threshold is undefined, the check is skipped (neither pass nor fail).
 * - If telemetry has null (e.g., startupTimeMs=null) and a threshold exists, we FAIL (missing required metric).
 * Returns a list of checks and an overall boolean.
 */
export function assertQoE(t: TelemetrySnapshot, th: QoEThresholds): AssertionResult {
  const checks: Assertion[] = [];

  // Helper to add a check (<= for "max", >= for "min")
  const addMax = (name: string, actual: number | null, max?: number) => {
    if (max === undefined) return;
    if (actual === null) {
      checks.push({ name, pass: false, actual, expected: max, reason: "metric is null but threshold provided" });
      return;
    }
    checks.push({ name, pass: actual <= max, actual, expected: max, reason: actual <= max ? undefined : "exceeds max" });
  };
  const addMin = (name: string, actual: number | null, min?: number) => {
    if (min === undefined) return;
    if (actual === null) {
      checks.push({ name, pass: false, actual, expected: min, reason: "metric is null but threshold provided" });
      return;
    }
    checks.push({ name, pass: actual >= min, actual, expected: min, reason: actual >= min ? undefined : "below min" });
  };

  addMax("startupTimeMs ≤ maxStartupMs", t.startupTimeMs, th.maxStartupMs);
  addMax("rebufferTimeMs ≤ maxRebufferTimeMs", t.rebufferTimeMs, th.maxRebufferTimeMs);
  addMax("rebufferEvents ≤ maxRebufferEvents", t.rebufferEvents, th.maxRebufferEvents);
  addMin("avgBitrateKbps ≥ minAvgBitrateKbps", t.avgBitrateKbps, th.minAvgBitrateKbps);
  addMax("qualitySwitches ≤ maxQualitySwitches", t.qualitySwitches, th.maxQualitySwitches);

  // overall = true if no explicit check failed (skipped checks don't affect it)
  const overallPass = checks.every(c => c.pass !== false);
  return { overallPass, checks };
}
