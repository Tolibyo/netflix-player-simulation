import { Telemetry } from "./telemetry";

export type DrmConfig = {
  /** If false or omitted, DRM is ignored entirely. */
  required?: boolean;
  /** If provided, only these device names are allowed when DRM is required. */
  allowDevices?: string[];
  /** Simulated license/handshake delay in ms (applied to startup). Default 300ms. */
  handshakeMs?: number;
};

/**
 * Perform a DRM "handshake".
 * - If DRM is not required, this is a no-op.
 * - If required and the device is not in allowDevices (if provided), throw fatal.
 * - Otherwise, simulate license delay and set/accumulate startup time.
 */
export function performDrmHandshake(deviceName: string, telemetry: Telemetry, cfg?: DrmConfig) {
  const required = !!cfg?.required;
  if (!required) return;

  const allow = cfg?.allowDevices ?? [];
  const ms = Number.isFinite(cfg?.handshakeMs as number) ? (cfg?.handshakeMs as number) : 300;

  if (allow.length > 0 && !allow.includes(deviceName)) {
    throw new Error(`DRM: device "${deviceName}" not permitted`);
  }

  // Treat license time as part of startup. If startup already set, accumulate.
  const snap = telemetry.snapshot();
  const prev = snap.startupTimeMs ?? 0;
  telemetry.setStartupTime(prev + Math.max(0, Math.floor(ms)));
}
