import fs from 'fs';

export type DeviceProfile = {
  name: string;
  maxResolution: string;
  maxBitrateKbps: number;
};

export function loadDevices(path: string): DeviceProfile[] {
  const raw = fs.readFileSync(path, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('devices must be an array');
  for (const d of data) {
    if (typeof d.name !== 'string') throw new Error('device.name missing');
    if (typeof d.maxResolution !== 'string') throw new Error('device.maxResolution missing');
    if (typeof d.maxBitrateKbps !== 'number') throw new Error('device.maxBitrateKbps missing');
  }
  return data as DeviceProfile[];
}
