export type TelemetrySnapshot = {
  startupTimeMs: number | null;
  rebufferEvents: number;
  rebufferTimeMs: number;
  avgBitrateKbps: number | null;
  qualitySwitches: number;
  adImpressions?: number;
  adSeamGapMs?: number;
};

export class Telemetry {
  private _startupTimeMs: number | null = null;
  private _rebufferEvents = 0;
  private _rebufferTimeMs = 0;
  private _qualitySwitches = 0;
  private _bitrateSum = 0;
  private _bitrateCount = 0;
  private _adImpressions = 0;
  private _adSeamGapMs = 0;

  snapshot(): TelemetrySnapshot {
    const avg = this._bitrateCount > 0 ? Math.round(this._bitrateSum / this._bitrateCount) : null;
    return {
      startupTimeMs: this._startupTimeMs,
      rebufferEvents: this._rebufferEvents,
      rebufferTimeMs: this._rebufferTimeMs,
      avgBitrateKbps: avg,
      qualitySwitches: this._qualitySwitches,
      adImpressions: this._adImpressions,
      adSeamGapMs: this._adSeamGapMs,
    };
  }

  reset() {
    this._startupTimeMs = null;
    this._rebufferEvents = 0;
    this._rebufferTimeMs = 0;
    this._qualitySwitches = 0;
    this._bitrateSum = 0;
    this._bitrateCount = 0;
    this._adImpressions = 0;
    this._adSeamGapMs = 0;
  }

  // ===== Methods used by tests from earlier stages =====
  setStartupTime(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this._startupTimeMs = Math.floor(ms);
  }

  addRebuffer(ms: number) {
    // Count an event regardless, clamp negative durations to 0
    this._rebufferEvents += 1;
    if (Number.isFinite(ms) && ms > 0) {
      this._rebufferTimeMs += Math.floor(ms);
    }
  }

  noteBitrate(kbps: number) {
    if (!Number.isFinite(kbps) || kbps <= 0) return;
    this._bitrateSum += Math.floor(kbps);
    this._bitrateCount += 1;
  }

  addQualitySwitch() {
    this._qualitySwitches += 1;
  }

  // ===== Ads-specific helpers (Stage 10) =====
  addAdImpression() {
    this._adImpressions += 1;
  }

  addAdSeamGap(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this._adSeamGapMs += Math.floor(ms);
  }
}
