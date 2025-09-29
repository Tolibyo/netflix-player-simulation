import type { Rendition, Segment, AdMarker } from "./manifest";
import type { NetProfile } from "./netProfiles";
import { SimpleABR } from "./abr";
import { Telemetry } from "./telemetry";

/**
 * Compute fetch time (ms) = (bitrateKbps * durationSec) / bandwidthKbps * 1000 + latencyMs
 * segment size ~ (bitrateKbps * durationSec) kilobits
 */
function fetchTimeMs(seg: Segment, bitrateKbps: number, net: NetProfile): number {
  const sizeKb = bitrateKbps * seg.durationSec; // kilobits (kb)
  const timeMs = (sizeKb / net.bandwidthKbps) * 1000 + net.latencyMs;
  return timeMs;
}

export type PlaybackResult = {
  ended: boolean;
  bufferMs: number;
  telemetry: ReturnType<Telemetry["snapshot"]>;
};

/**
 * Simulate playback of a VOD stream (multiple renditions) under a given network profile.
 * Each call to step() downloads exactly one segment (content or ad).
 */
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

  constructor(
    renditions: Rendition[],
    net: NetProfile,
    telemetry: Telemetry,
    abr: SimpleABR,
    opts?: { ads?: AdMarker[]; adJoinDelayMs?: number; adBitrateKbps?: number }
  ) {
    this.abr = abr;
    this.net = net;
    this.telemetry = telemetry;
    this.rendition = abr.current;

    // ads options (optional)
    this.ads = opts?.ads ?? [];
    this.adJoinDelayMs = opts?.adJoinDelayMs ?? 300; // simulated ad decisioning delay
    this.adBitrateKbps = opts?.adBitrateKbps ?? 800; // default ad bitrate
  }

  step(): PlaybackResult {
    // If we ran out of content segments and are not inside an ad → stop
    if (!this.inAd && this.segIndex >= this.rendition.segments.length) {
      return { ended: true, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
    }

    // If we are not inside an ad, check whether we must enter an ad break now.
    if (!this.inAd && this.adIndex < this.ads.length) {
      // compute played content time up to segIndex (sum content durations so far)
      const playedContentSec = this.rendition.segments
        .slice(0, this.segIndex)
        .reduce((acc, s) => acc + s.durationSec, 0);
      const nextAd = this.ads[this.adIndex];
      if (playedContentSec >= nextAd.atSec) {
        // simulate ad seam delay (decisioning/loading)
        this.telemetry.addAdSeamGap(this.adJoinDelayMs);
        // enter ad pod: assume ad segments are 10s chunks
        const adSegCount = Math.ceil(nextAd.durationSec / 10);
        this.inAd = true;
        this.adSegsRemaining = adSegCount;
      }
    }

    // Choose what we are fetching this step: content segment or ad segment
    let fetchMs = 0;
    let seg: Segment;
    let bitrateForFetch = this.rendition.bitrateKbps;

    if (this.inAd) {
      // Virtual ad segment: duration 10s, synthetic URI
      seg = { uri: `ad_s${this.adSegsRemaining}.bin`, durationSec: 10 };
      bitrateForFetch = this.adBitrateKbps;
      fetchMs = fetchTimeMs(seg, bitrateForFetch, this.net);
    } else {
      seg = this.rendition.segments[this.segIndex];
      fetchMs = fetchTimeMs(seg, bitrateForFetch, this.net);
    }

    // buffer update
    this.bufferMs += seg.durationSec * 1000; // add segment duration
    this.bufferMs -= fetchMs;                // subtract network fetch time

    if (this.bufferMs < 0) {
      // bufferMs is negative => amount below zero is the stall duration
      const stallMs = Math.abs(this.bufferMs);
      this.telemetry.addRebuffer(stallMs);
      this.bufferMs = 0; // clamp buffer after recording the stall
    }

    // update ABR decision for next segment (ads use fixed bitrate; ABR still updated)
    this.rendition = this.abr.update(this.net.bandwidthKbps);

    // advance indices
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

    return { ended: false, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
  }
}
