import { describe, it, expect } from 'vitest';
import { parseManifest } from '../packages/player-sim/src/manifest';

describe('HLS manifest', () => {
  it('parses 3 renditions with 6 segments of 10s', () => {
    const m = parseManifest('configs/manifests/vod_hls.json');
    expect(m.format).toBe('HLS');
    expect(m.renditions.length).toBe(3);
    for (const r of m.renditions) {
      expect(r.bitrateKbps).toBeGreaterThan(0);
      expect(r.segments.length).toBe(6);
      for (const s of r.segments) {
        expect(typeof s.uri).toBe('string');
        expect(s.durationSec).toBe(10);
      }
    }
  });
});
