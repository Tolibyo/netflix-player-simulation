import fs from "fs";
import path from "path";
import { parseManifest, type Rendition } from "./manifest";
import { loadProfiles, type NetProfile } from "./netProfiles";
import { loadDevices } from "./deviceProfiles";
import { Telemetry } from "./telemetry";
import { SimpleABR } from "./abr";
import { Playback } from "./playback";
import { assertQoE, loadThresholds, type QoEThresholds } from "./assertions";
import { performDrmHandshake, type DrmConfig } from "./drm";
import { writeJsonReport } from "./reporter/jsonReporter";

export type ScenarioConfig = {
  name: string;
  manifestPath: string;
  deviceName: string;
  networkName?: string;              // load by name from net-profiles.json
  networkInline?: NetProfile;        // alternatively, supply inline network
  thresholdsPath: string;            // QoE thresholds JSON
  drm?: DrmConfig;                   // optional DRM behavior
};

export type ScenarioResult = {
  name: string;
  ended: boolean;
  telemetry: ReturnType<Telemetry["snapshot"]>;
  qoe: ReturnType<typeof assertQoE>;
};

function readJson<T = unknown>(p: string): T {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, "utf-8")) as T;
}

/**
 * Resolve the network profile either by name (from configs/net-profiles.json)
 * or via the inline override in the scenario file.
 */
function resolveNetwork(sc: ScenarioConfig): NetProfile {
  if (sc.networkInline) return sc.networkInline;
  if (!sc.networkName) throw new Error("Scenario: either networkName or networkInline must be provided");
  const profiles = loadProfiles("configs/net-profiles.json");
  const n = profiles.find(p => p.name === sc.networkName);
  if (!n) throw new Error(`Scenario: network profile not found: ${sc.networkName}`);
  return n;
}

/**
 * Run the full VOD playback:
 * - DRM gate (optional) adds startup time or fails fast
 * - ABR starts conservative; each step fetches one segment
 * - Buffer updates & rebuffer metrics
 * - Optional JSON export behind EXPORT_JSON=1
 */
export function runScenario(scPath: string): ScenarioResult {
  const sc = readJson<ScenarioConfig>(scPath);
  const manifest = parseManifest(sc.manifestPath);
  const device = loadDevices("configs/device-profiles.json").find(d => d.name === sc.deviceName);
  if (!device) throw new Error(`Scenario: device not found: ${sc.deviceName}`);
  const net = resolveNetwork(sc);
  const thresholds: QoEThresholds = loadThresholds(sc.thresholdsPath);

  // Device cap (optional hook): cap renditions above device.maxBitrateKbps
  const cappedRenditions: Rendition[] = manifest.renditions.filter(r => r.bitrateKbps <= device.maxBitrateKbps);
  if (cappedRenditions.length === 0) throw new Error("Scenario: no renditions under device bitrate cap");

  const telemetry = new Telemetry();

  // DRM happens before playback starts; may fail fast; adds to startupTime
  performDrmHandshake(device.name, telemetry, sc.drm);

  const abr = new SimpleABR(cappedRenditions, { telemetry });
  const pb = new Playback(cappedRenditions, net, telemetry, abr, { ads: manifest.ads });

  // Play until the rendition's segment list ends
  let ended = false;
  while (true) {
    const res = pb.step();
    if (res.ended) { ended = true; break; }
  }

  const snap = telemetry.snapshot();
  const qoe = assertQoE(snap, thresholds);
  const result: ScenarioResult = { name: sc.name, ended, telemetry: snap, qoe };

  // Optional JSON export
  if (process.env.EXPORT_JSON === "1") {
    writeJsonReport(result);
  }

  return result;
}

/**
 * Produce a compact, human-readable report for console output.
 */
export function formatReport(r: ScenarioResult): string {
  const lines: string[] = [];
  lines.push(`Scenario: ${r.name}`);
  lines.push(`Ended: ${r.ended}`);
  lines.push(`— Metrics —`);
  lines.push(`  startupTimeMs:     ${r.telemetry.startupTimeMs}`);
  lines.push(`  rebufferEvents:    ${r.telemetry.rebufferEvents}`);
  lines.push(`  rebufferTimeMs:    ${r.telemetry.rebufferTimeMs}`);
  lines.push(`  avgBitrateKbps:    ${r.telemetry.avgBitrateKbps}`);
  lines.push(`  qualitySwitches:   ${r.telemetry.qualitySwitches}`);
  lines.push(`— QoE Checks —`);
  for (const c of r.qoe.checks) {
    const status = c.pass ? "PASS" : "FAIL";
    const exp = c.expected !== undefined ? ` (threshold ${c.expected})` : "";
    const act = c.actual === null ? "null" : String(c.actual);
    const why = c.reason ? ` — ${c.reason}` : "";
    lines.push(`  [${status}] ${c.name}: actual=${act}${exp}${why}`);
  }
  lines.push(`— Overall —`);
  lines.push(`  ${r.qoe.overallPass ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}
