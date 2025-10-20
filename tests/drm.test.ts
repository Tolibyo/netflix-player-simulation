import { describe, it, expect } from "vitest";
import { Telemetry } from "../packages/player-sim/src/telemetry";
import { performDrmHandshake } from "../packages/player-sim/src/drm";

describe("DRM mock", () => {
  it("adds handshake time to startup when allowed", () => {
    const t = new Telemetry();
    t.setStartupTime(200);
    performDrmHandshake("Mid Browser", t, {
      required: true,
      allowDevices: ["Mid Browser", "TV 4K"],
      handshakeMs: 450
    });
    expect(t.snapshot().startupTimeMs).toBe(650);
  });

  it("throws for blocked device", () => {
    const t = new Telemetry();
    expect(() =>
      performDrmHandshake("Mid Browser", t, {
        required: true,
        allowDevices: ["TV 4K"],
        handshakeMs: 300
      })
    ).toThrow(/DRM: device "Mid Browser" not permitted/);
  });

  it("no-op when not required", () => {
    const t = new Telemetry();
    performDrmHandshake("Any Device", t, { required: false, handshakeMs: 1000 });
    expect(t.snapshot().startupTimeMs).toBeNull();
  });
});
