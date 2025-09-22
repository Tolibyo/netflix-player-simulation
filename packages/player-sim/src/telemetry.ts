export type TelemetrySnapshot = {
  startupTimeMs: number | null;
  rebufferEvents: number;
  rebufferTimeMs: number;
  avgBitrateKbps: number | null;
  qualitySwitches: number;
};

export class Telemetry {
  private _startupTimeMs: number | null = null;
  private _rebufferEvents = 0;
  private _rebufferTimeMs = 0;
  private _qualitySwitches = 0;
  private _bitrateSum = 0;
  private _bitrateCount = 0;

  setStartupTime(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) throw new Error("startupTime must be >= 0");
    this._startupTimeMs = ms;
  }

  addRebuffer(ms: number) {
    if (!Number.isFinite(ms)) throw new Error("rebuffer ms must be a number");
    const safe = Math.max(0, ms);
    this._rebufferEvents += 1;
    this._rebufferTimeMs += safe;
  }

  addQualitySwitch() {
    this._qualitySwitches += 1;
  }

  noteBitrate(kbps: number) {
    if (!Number.isFinite(kbps) || kbps <= 0) return; // ignore invalid samples
    this._bitrateSum += kbps;
    this._bitrateCount += 1;
  }

  snapshot(): TelemetrySnapshot {
    const avg =
      this._bitrateCount > 0 ? Math.round(this._bitrateSum / this._bitrateCount) : null;
    return {
      startupTimeMs: this._startupTimeMs,
      rebufferEvents: this._rebufferEvents,
      rebufferTimeMs: this._rebufferTimeMs,
      avgBitrateKbps: avg,
      qualitySwitches: this._qualitySwitches,
    };
  }

  reset() {
    this._startupTimeMs = null;
    this._rebufferEvents = 0;
    this._rebufferTimeMs = 0;
    this._qualitySwitches = 0;
    this._bitrateSum = 0;
    this._bitrateCount = 0;
  }
}
