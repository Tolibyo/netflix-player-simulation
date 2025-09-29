import { describe, it, expect } from "vitest";
import { parseManifest } from "../packages/player-sim/src/manifest";
import { loadProfiles, NetProfile } from "../packages/player-sim/src/netProfiles";
import { Telemetry } from "../packages/player-sim/src/telemetry";
import { SimpleABR } from "../packages/player-sim/src/abr";
import { Playback } from "../packages/player-sim/src/playback";

describe("Ads insertion", () => {
  it("plays an ad break and records ad metrics", () => {
    const manifest = parseManifest("configs/manifests/vod_hls.json");
    const nets: NetProfile[] = loadProfiles("configs/net-profiles.json");
    const good = nets.find(n => n.name === "Good")!;

    const telemetry = new Telemetry();
    const abr = new SimpleABR(manifest.renditions, { telemetry });
    const pb = new Playback(
      manifest.renditions,
      good,
      telemetry,
      abr,
      { ads: manifest.ads, adJoinDelayMs: 300, adBitrateKbps: 800 }
    );

    // run until end
    while (true) {
      const r = pb.step();
      if (r.ended) break;
    }

    const snap = telemetry.snapshot();
    // We expect exactly one ad break, seam gap recorded, and sane values.
    expect(snap.adImpressions).toBe(1);
    expect((snap.adSeamGapMs ?? 0)).toBeGreaterThanOrEqual(300);
    // Ensure regular metrics are still present
    expect(snap.rebufferEvents).toBeGreaterThanOrEqual(0);
  });
});
