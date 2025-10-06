import { describe, it, expect } from "vitest";
import { parseManifest } from "../packages/player-sim/src/manifest";
import { loadProfiles, NetProfile } from "../packages/player-sim/src/netProfiles";
import { Telemetry } from "../packages/player-sim/src/telemetry";
import { SimpleABR } from "../packages/player-sim/src/abr";
import { Playback } from "../packages/player-sim/src/playback";

describe("Live playback", () => {
  it("records join latency and reduces drift using catch-up rate", () => {
    const m = parseManifest("configs/manifests/vod_hls.json");
    const net: NetProfile = loadProfiles("configs/net-profiles.json").find(n => n.name === "Good")!;
    const t = new Telemetry();
    const abr = new SimpleABR(m.renditions, { telemetry: t });

    const pb = new Playback(
      m.renditions,
      net,
      t,
      abr,
      {
        ads: m.ads, // ads optional; they won't fire during short run
        live: { enabled: true, startBehindSec: 25, targetDriftSec: 12, catchupRate: 1.25 },
      }
    );

    // Run a handful of steps to allow catch-up to take effect
    for (let i = 0; i < 12; i++) pb.step();

    const snap = t.snapshot();

    // Join latency ~ 25s (25000ms)
    expect(snap.liveJoinLatencyMs).toBeGreaterThanOrEqual(24000);
    expect(snap.liveJoinLatencyMs).toBeLessThanOrEqual(26000);

    // We expect drift to be driven down close to target (<= ~15s to allow some slack)
    expect((snap.finalLiveDriftMs ?? 999999)).toBeLessThanOrEqual(15000);

    // And max drift should be >= join latency initially
    expect((snap.maxLiveDriftMs ?? 0)).toBeGreaterThanOrEqual(24000);
  });
});
