import { describe, it, expect } from 'vitest';
import { loadProfiles } from '../packages/player-sim/src/netProfiles';

describe('network profiles', () => {
  it('loads Good and Poor profiles from json', () => {
    const profiles = loadProfiles('configs/net-profiles.json');
    expect(profiles.length).toBeGreaterThanOrEqual(2);

    const good = profiles.find(p => p.name === 'Good')!;
    expect(good.bandwidthKbps).toBe(5000);
    expect(good.latencyMs).toBe(50);

    const poor = profiles.find(p => p.name === 'Poor')!;
    expect(poor.bandwidthKbps).toBe(1000);
    expect(poor.latencyMs).toBe(200);
  });
});
