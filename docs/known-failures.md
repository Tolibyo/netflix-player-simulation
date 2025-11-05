# QoE Scenarios with Expected Failures

### `vod_verypoor_inline` scenario

- **What it does:** Simulates a *very poor* network condition that intentionally exceeds the `maxRebufferTimeMs` threshold.
- **Expected Outcome:** `overallPass = false` and the `rebufferTimeMs` QoE check fails.
- **Why this matters:** This confirms the QoE gate correctly rejects severely degraded playback rather than silently passing it.
- **How it’s enforced:** `tests/scenario.test.ts` contains a dedicated test
  (`"vod_verypoor_inline fails QoE as expected under very poor network"`) that asserts this behavior.
