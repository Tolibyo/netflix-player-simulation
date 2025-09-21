import { describe, it, expect } from 'vitest';
import { loadDevices } from '../packages/player-sim/src/deviceProfiles';

describe('device profiles', () => {
  it('loads Mid Browser and TV 4K from json', () => {
    const devices = loadDevices('configs/device-profiles.json');
    expect(devices.length).toBeGreaterThanOrEqual(2);

    const mid = devices.find(d => d.name === 'Mid Browser')!;
    expect(mid.maxResolution).toBe('1080p');
    expect(mid.maxBitrateKbps).toBe(5000);

    const tv = devices.find(d => d.name === 'TV 4K')!;
    expect(tv.maxResolution).toBe('2160p');
    expect(tv.maxBitrateKbps).toBe(25000);
  });
});
