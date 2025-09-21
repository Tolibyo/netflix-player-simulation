import fs from 'fs';

export type NetProfile = {
  name: string;
  bandwidthKbps: number;
  latencyMs: number;
};

export function loadProfiles(path: string): NetProfile[] {
  const raw = fs.readFileSync(path, 'utf-8');
  const data = JSON.parse(raw);
  // minimal safety: ensure required fields exist
  if (!Array.isArray(data)) throw new Error('profiles must be an array');
  for (const p of data) {
    if (typeof p.name !== 'string') throw new Error('profile.name missing');
    if (typeof p.bandwidthKbps !== 'number') throw new Error('profile.bandwidthKbps missing');
    if (typeof p.latencyMs !== 'number') throw new Error('profile.latencyMs missing');
  }
  return data as NetProfile[];
}
