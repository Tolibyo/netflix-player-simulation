import type { Rendition } from "./manifest";
import type { Telemetry } from "./telemetry";

// Ensure ascending order by bitrate so selection math is predictable.
function sortByBitrate(rends: Rendition[]): Rendition[] {
  return [...rends].sort((a, b) => a.bitrateKbps - b.bitrateKbps);
}

/**
 * Pure, stateless picker: returns the highest rendition whose bitrate
 * is <= (bandwidth * safetyMargin). Falls back to the lowest if none fit.
 * Throws if renditions is empty (caller error).
 */
export function pickRendition(
  bandwidthKbps: number,
  renditions: Rendition[],
  safetyMargin = 0.85
): Rendition {
  const sorted = sortByBitrate(renditions);
  if (sorted.length === 0) {
    throw new Error("pickRendition: renditions[] is empty");
  }
  const budget = bandwidthKbps * safetyMargin;
  let chosen: Rendition = sorted[0];
  for (const r of sorted) {
    if (r.bitrateKbps <= budget) chosen = r;
    else break;
  }
  return chosen;
}

export type SimpleABROpts = {
  upStableCount?: number;    // need N consecutive "good" samples to go up
  safetyMarginUp?: number;   // margin for upswitch checks (conservative)
  safetyMarginDown?: number; // margin for downswitch (trigger earlier)
  telemetry?: Telemetry | undefined; // optional recorder
};

// Minimal stateful controller with hysteresis:
// - downswitch immediately if current bitrate > bandwidth * safetyMarginDown
// - upswitch by ONE level only after upStableCount "good" samples (next level fits under safetyMarginUp)
export class SimpleABR {
  private renditions: Rendition[];
  private currentIdx: number;
  private stableGood = 0;
  // Simpler options typing avoids exactOptionalPropertyTypes pitfalls
  private opts: {
    upStableCount: number;
    safetyMarginUp: number;
    safetyMarginDown: number;
    telemetry?: Telemetry | undefined;
  };

  constructor(renditions: Rendition[], opts: SimpleABROpts = {}) {
    this.renditions = sortByBitrate(renditions);
    if (this.renditions.length === 0) {
      throw new Error("SimpleABR: renditions[] is empty");
    }
    this.opts = {
      upStableCount: opts.upStableCount ?? 3,
      safetyMarginUp: opts.safetyMarginUp ?? 0.85,
      safetyMarginDown: opts.safetyMarginDown ?? 1.05,
      telemetry: opts.telemetry
    };
    this.currentIdx = 0; // start conservative (lowest)
  }

  get current(): Rendition {
    // Safe because constructor guards non-empty
    return this.renditions[this.currentIdx];
  }

  // Call once per segment with the latest measured bandwidth.
  update(bandwidthKbps: number): Rendition {
    const { safetyMarginUp, safetyMarginDown, upStableCount, telemetry } = this.opts;
    const current = this.current; // safe (non-empty invariant)

    // 1) Downswitch if current is too "expensive" for the measured bandwidth.
    const downBudget = bandwidthKbps * safetyMarginDown;
    if (current.bitrateKbps > downBudget) {
      const affordable = pickRendition(bandwidthKbps, this.renditions, safetyMarginUp);
      const newIdx = this.renditions.indexOf(affordable);
      if (newIdx !== this.currentIdx) {
        this.currentIdx = newIdx;
        this.stableGood = 0;
        telemetry?.addQualitySwitch();
      }
      telemetry?.noteBitrate(this.current.bitrateKbps);
      return this.current;
    }

    // 2) Consider upswitch after consecutive “good” samples (look only one level up).
    const nextIdx = Math.min(this.currentIdx + 1, this.renditions.length - 1);
    if (nextIdx > this.currentIdx) {
      const next = this.renditions[nextIdx]; // exists because of the bound check
      const upBudget = bandwidthKbps * safetyMarginUp;
      if (next.bitrateKbps <= upBudget) {
        this.stableGood += 1;
        if (this.stableGood >= upStableCount) {
          this.currentIdx = nextIdx;      // go up by one level
          this.stableGood = 0;            // reset streak
          telemetry?.addQualitySwitch();
        }
      } else {
        this.stableGood = 0;              // break the streak
      }
    } else {
      this.stableGood = 0;                // already at top
    }

    telemetry?.noteBitrate(this.current.bitrateKbps);
    return this.current;
  }
}
