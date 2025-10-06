export type TelemetrySnapshot = {
  startupTimeMs: number | null;
  rebufferEvents: number;
  rebufferTimeMs: number;
  avgBitrateKbps: number | null;
  qualitySwitches: number;
  // Ads
  adImpressions?: number;
  adSeamGapMs?: number;
  // Live 
  liveJoinLatencyMs?: number;
  maxLiveDriftMs?: number;
  finalLiveDriftMs?: number;
};

export class Telemetry {
  private _startupTimeMs: number | null = null;
  private _rebufferEvents = 0;
  private _rebufferTimeMs = 0;
  private _qualitySwitches = 0;
  private _bitrateSum = 0;
  private _bitrateCount = 0;

  // Ads
  private _adImpressions = 0;
  private _adSeamGapMs = 0;

  // Live
  private _liveJoinLatencyMs: number | undefined = undefined;
  private _maxLiveDriftMs: number | undefined = undefined;
  private _finalLiveDriftMs: number | undefined = undefined;

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
      liveJoinLatencyMs: this._liveJoinLatencyMs,
      maxLiveDriftMs: this._maxLiveDriftMs,
      finalLiveDriftMs: this._finalLiveDriftMs,
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
    this._liveJoinLatencyMs = undefined;
    this._maxLiveDriftMs = undefined;
    this._finalLiveDriftMs = undefined;
  }

  // ---- Existing public API (used by tests) ----
  setStartupTime(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this._startupTimeMs = Math.floor(ms);
  }
  addRebuffer(ms: number) {
    this._rebufferEvents += 1;
    if (Number.isFinite(ms) && ms > 0) this._rebufferTimeMs += Math.floor(ms);
  }
  noteBitrate(kbps: number) {
    if (!Number.isFinite(kbps) || kbps <= 0) return;
    this._bitrateSum += Math.floor(kbps);
    this._bitrateCount += 1;
  }
  addQualitySwitch() {
    this._qualitySwitches += 1;
  }

  // ---- Ads helpers ----
  addAdImpression() {
    this._adImpressions += 1;
  }
  addAdSeamGap(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this._adSeamGapMs += Math.floor(ms);
  }

  // ---- Live helpes ----
  setLiveJoinLatency(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this._liveJoinLatencyMs = Math.floor(ms);
  }
  noteLiveDrift(currentDriftMs: number) {
    if (!Number.isFinite(currentDriftMs)) return;
    const d = Math.floor(currentDriftMs);
    this._finalLiveDriftMs = d;
    if (this._maxLiveDriftMs === undefined || d > this._maxLiveDriftMs) {
      this._maxLiveDriftMs = d;
    }
  }
}
