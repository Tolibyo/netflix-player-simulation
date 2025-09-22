import { describe, it, expect } from "vitest";
import { pickRendition, SimpleABR } from "../packages/player-sim/src/abr";
import type { Rendition } from "../packages/player-sim/src/manifest";

const RENDS: Rendition[] = [
  { bitrateKbps: 800,  segments: [] },
  { bitrateKbps: 2500, segments: [] },
  { bitrateKbps: 5000, segments: [] },
];

describe("pickRendition (pure)", () => {
  it("picks highest affordable under margin", () => {
    // bandwidth=3000, margin=0.85 => budget=2550 -> 2500 fits, 5000 doesn't
    const r = pickRendition(3000, RENDS, 0.85);
    expect(r.bitrateKbps).toBe(2500);
  });

  it("falls back to lowest if nothing fits", () => {
    const r = pickRendition(200, RENDS, 0.85);
    expect(r.bitrateKbps).toBe(800);
  });
});

describe("SimpleABR (stateful)", () => {
  it("upswitches after 3 stable good samples", () => {
    const abr = new SimpleABR(RENDS, { upStableCount: 3, safetyMarginUp: 0.85, safetyMarginDown: 1.05 });

    // Need 3 consecutive "good" updates to go from 800 -> 2500
    for (let i = 0; i < 2; i++) {
      const r = abr.update(3000); // budget for up=2550, so next(2500) is affordable
      expect(r.bitrateKbps).toBe(800); // not yet
    }
    const r3 = abr.update(3000);
    expect(r3.bitrateKbps).toBe(2500);

    // Next climb: 2500 -> 5000 (again require 3 good samples)
    for (let i = 0; i < 3; i++) abr.update(7000); // up budget=5950 -> 5000 fits
    expect(abr.current.bitrateKbps).toBe(5000);
  });

  it("downswitches immediately when current is too expensive", () => {
    const abr = new SimpleABR(RENDS, { upStableCount: 3, safetyMarginUp: 0.85, safetyMarginDown: 1.05 });
    // Warm to 2500 first (three good samples)
    for (let i = 0; i < 3; i++) abr.update(3000);
    expect(abr.current.bitrateKbps).toBe(2500);

    // Bandwidth tanks to 1000 => 2500 > 1000*1.05 -> immediate drop to 800
    const r = abr.update(1000);
    expect(r.bitrateKbps).toBe(800);
  });
});
