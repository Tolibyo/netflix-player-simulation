import { describe, it, expect } from "vitest";
import { parseManifest } from "../packages/player-sim/src/manifest";
import { loadProfiles, NetProfile } from "../packages/player-sim/src/netProfiles";
import { Telemetry } from "../packages/player-sim/src/telemetry";
import { SimpleABR } from "../packages/player-sim/src/abr";
import { Playback } from "../packages/player-sim/src/playback";

const MANIFEST = parseManifest("configs/manifests/vod_hls.json");
const NETS: NetProfile[] = loadProfiles("configs/net-profiles.json");

// helper: grab profile by name
function byName(name: string): NetProfile {
  const p = NETS.find(n => n.name === name);
  if (!p) throw new Error(`missing net profile: ${name}`);
  return p;
}

describe("Playback loop", () => {
  it("accumulates buffer under good network", () => {
    const telemetry = new Telemetry();
    const abr = new SimpleABR(MANIFEST.renditions);
    const pb = new Playback(MANIFEST.renditions, byName("Good"), telemetry, abr);

    for (let i = 0; i < 3; i++) {
      const res = pb.step();
      expect(res.bufferMs).toBeGreaterThan(0);
      expect(res.telemetry.rebufferEvents).toBe(0);
    }
  });

  it("rebuffers under very poor network", () => {
    // Inline profile that guarantees stall: 300 kbps + 200 ms latency
    // For 800 kbps * 10s segments => 8000 kilobits / 300 kbps ~ 26.7s + 200ms => fetch > duration
    const veryPoor: NetProfile = { name: "VeryPoor", bandwidthKbps: 300, latencyMs: 200 };

    const telemetry = new Telemetry();
    const abr = new SimpleABR(MANIFEST.renditions);
    const pb = new Playback(MANIFEST.renditions, veryPoor, telemetry, abr);

    let sawRebuffer = false;
    for (let i = 0; i < 3; i++) {
      const res = pb.step();
      if (res.telemetry.rebufferEvents > 0) sawRebuffer = true;
    }
    expect(sawRebuffer).toBe(true);
  });
});
