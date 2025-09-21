import { describe, it, expect } from 'vitest';
import { parseManifest } from '../packages/player-sim/src/manifest';

describe('DASH manifest', () => {
  it('parses to normalized shape: 3 renditions × 6 segments × 10s', () => {
    const m = parseManifest('configs/manifests/vod_dash.json');
    expect(m.format).toBe('DASH');
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
