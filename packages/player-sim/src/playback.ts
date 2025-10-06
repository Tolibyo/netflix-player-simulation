import type { Rendition, Segment, AdMarker } from "./manifest";
import type { NetProfile } from "./netProfiles";
import { SimpleABR } from "./abr";
import { Telemetry } from "./telemetry";

/**
 * Compute fetch time (ms) = (bitrateKbps * durationSec) / bandwidthKbps * 1000 + latencyMs
 * segment size ~ (bitrateKbps * durationSec) kilobits
 */
function fetchTimeMs(seg: Segment, bitrateKbps: number, net: NetProfile): number {
  const sizeKb = bitrateKbps * seg.durationSec;
  const timeMs = (sizeKb / net.bandwidthKbps) * 1000 + net.latencyMs;
  return timeMs;
}

export type PlaybackResult = {
  ended: boolean;
  bufferMs: number;
  telemetry: ReturnType<Telemetry["snapshot"]>;
};

type LiveOpts = {
  enabled: boolean;
  /** target drift we consider acceptable (seconds) */
  targetDriftSec?: number;
  /** playback rate to apply when catching up (>1 means faster) */
  catchupRate?: number;
  /** initial distance (seconds) behind live when we join */
  startBehindSec?: number;
};

export class Playback {
  private abr: SimpleABR;
  private net: NetProfile;
  private telemetry: Telemetry;
  private bufferMs = 0;
  private segIndex = 0;
  private rendition: Rendition;

  // ads
  private ads: AdMarker[] = [];
  private adIndex = 0;
  private inAd = false;
  private adSegsRemaining = 0;
  private readonly adJoinDelayMs: number;
  private readonly adBitrateKbps: number;

  // live
  private readonly live: LiveOpts | undefined;
  private driftMs = 0; // positive => we're behind live

  constructor(
    renditions: Rendition[],
    net: NetProfile,
    telemetry: Telemetry,
    abr: SimpleABR,
    opts?: {
      ads?: AdMarker[];
      adJoinDelayMs?: number;
      adBitrateKbps?: number;
      live?: LiveOpts;
    }
  ) {
    this.abr = abr;
    this.net = net;
    this.telemetry = telemetry;
    this.rendition = abr.current;

    // ads
    this.ads = opts?.ads ?? [];
    this.adJoinDelayMs = opts?.adJoinDelayMs ?? 300;
    this.adBitrateKbps = opts?.adBitrateKbps ?? 800;

    // live
    if (opts?.live?.enabled) {
      const startBehindSec = opts.live.startBehindSec ?? 20;
      this.live = {
        enabled: true,
        targetDriftSec: opts.live.targetDriftSec ?? 12,
        catchupRate: opts.live.catchupRate ?? 1.25,
        startBehindSec,
      };
      this.driftMs = Math.floor(startBehindSec * 1000);
      this.telemetry.setLiveJoinLatency(this.driftMs);
      this.telemetry.noteLiveDrift(this.driftMs);
    } else {
      this.live = undefined;
    }
  }

  step(): PlaybackResult {
    // For VOD: stop when content finished and not inside an ad.
    // For Live: we never "end" — tests should run a fixed number of steps.
    if (!this.live && !this.inAd && this.segIndex >= this.rendition.segments.length) {
      return { ended: true, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
    }

    // ENTER AD if needed (content time gate)
    if (!this.inAd && this.adIndex < this.ads.length) {
      const playedContentSec = this.rendition.segments
        .slice(0, Math.min(this.segIndex, this.rendition.segments.length))
        .reduce((acc, s) => acc + s.durationSec, 0);
      const nextAd = this.ads[this.adIndex];
      if (playedContentSec >= nextAd.atSec) {
        this.telemetry.addAdSeamGap(this.adJoinDelayMs);
        const adSegCount = Math.ceil(nextAd.durationSec / 10);
        this.inAd = true;
        this.adSegsRemaining = adSegCount;
      }
    }

    // Decide what segment we "download" this tick
    let seg: Segment;
    let bitrateForFetch = this.rendition.bitrateKbps;

    if (this.inAd) {
      seg = { uri: `ad_s${this.adSegsRemaining}.bin`, durationSec: 10 };
      bitrateForFetch = this.adBitrateKbps;
    } else {
      // VOD: bounded; Live: we can recycle segments in a loop to simulate ongoing feed
      const contentSegs = this.rendition.segments;
      const idx = this.live ? (this.segIndex % contentSegs.length) : this.segIndex;
      seg = contentSegs[idx];
    }

    const fetchMs = fetchTimeMs(seg, bitrateForFetch, this.net);

    // LIVE catch-up rate logic
    const isLive = !!this.live;
    const targetDriftSec = this.live?.targetDriftSec ?? 0;
    const catchupRate = this.live?.catchupRate ?? 1;
    const catchingUp = isLive && (this.driftMs / 1000) > targetDriftSec;
    const playRate = catchingUp ? catchupRate : 1;

    // Buffer accounting:
    // We "add" the segment's playtime (at current rate) then subtract fetch time.
    // Extra play rate > 1 means we consume buffer faster to catch up.
    const playedMs = seg.durationSec * 1000 * playRate;
    this.bufferMs += playedMs;
    this.bufferMs -= fetchMs;

    if (this.bufferMs < 0) {
      const stallMs = Math.abs(this.bufferMs);
      this.telemetry.addRebuffer(stallMs);
      this.bufferMs = 0;
    }

    // Update ABR for next step (ads fixed bitrate; ABR still updated)
    this.rendition = this.abr.update(this.net.bandwidthKbps);

    // Advance indices
    if (this.inAd) {
      this.adSegsRemaining -= 1;
      if (this.adSegsRemaining <= 0) {
        this.inAd = false;
        this.adIndex += 1;
        this.telemetry.addAdImpression();
      }
    } else {
      this.segIndex++;
    }

    // LIVE drift update:
    // Wall-clock advanced by fetchMs (network time),
    // we "consumed" playedMs of content time. Drift grows if wall > played.
    if (isLive) {
      this.driftMs += fetchMs - playedMs;
      if (this.driftMs < 0) this.driftMs = 0; // don't go ahead of live in this simple model
      this.telemetry.noteLiveDrift(this.driftMs);
    }

    // For live we never end, for VOD we only end on the early return
    return { ended: false, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
  }
}
