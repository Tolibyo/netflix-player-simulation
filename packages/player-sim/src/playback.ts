import type { Rendition, Segment } from "./manifest";
import type { NetProfile } from "./netProfiles";
import { SimpleABR } from "./abr";
import { Telemetry } from "./telemetry";

/**
 * Compute fetch time (ms) = segmentSizeKbits / bandwidthKbps + latencyMs
 * segment size ~ (bitrateKbps * durationSec) kilobits
 */
function fetchTimeMs(seg: Segment, bitrateKbps: number, net: NetProfile): number {
  const sizeKb = bitrateKbps * seg.durationSec; // kilobits
  const timeMs = (sizeKb / net.bandwidthKbps) * 1000 + net.latencyMs;
  return timeMs;
}

export type PlaybackResult = {
  ended: boolean;
  bufferMs: number;
  telemetry: ReturnType<Telemetry["snapshot"]>;
};

/**
 * Simulate playback of one VOD rendition set under a given network/device.
 * Each call to step() advances one segment.
 */
export class Playback {
  private abr: SimpleABR;
  private net: NetProfile;
  private telemetry: Telemetry;
  private bufferMs = 0;
  private segIndex = 0;
  private rendition: Rendition;

  constructor(renditions: Rendition[], net: NetProfile, telemetry: Telemetry, abr: SimpleABR) {
    this.abr = abr;
    this.net = net;
    this.telemetry = telemetry;
    this.rendition = abr.current;
  }

  step(): PlaybackResult {
    // If we ran out of segments → stop
    if (this.segIndex >= this.rendition.segments.length) {
      return { ended: true, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
    }

    const seg = this.rendition.segments[this.segIndex];
    const fetchMs = fetchTimeMs(seg, this.rendition.bitrateKbps, this.net);

    // buffer update
    this.bufferMs += seg.durationSec * 1000; // add segment duration
    this.bufferMs -= fetchMs; // subtract network fetch time

    if (this.bufferMs < 0) {
      // bufferMs is negative => amount below zero is the stall duration
      const stallMs = Math.abs(this.bufferMs);
      this.telemetry.addRebuffer(stallMs);
      this.bufferMs = 0; // clamp buffer after recording the stall
    }
    

    // update ABR decision for next segment
    this.rendition = this.abr.update(this.net.bandwidthKbps);

    this.segIndex++;
    return { ended: false, bufferMs: this.bufferMs, telemetry: this.telemetry.snapshot() };
  }
}
