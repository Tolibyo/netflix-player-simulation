# Known Failing Tests (Expected Behavior)

### `tests/scenario.test.ts > vod_verypoor_inline meets lenient thresholds`

- **Reason:** The scenario simulates a *very poor* network condition that intentionally exceeds the `maxRebufferTimeMs` threshold.
- **Expected Outcome:** `overallPass = false`
- **Rationale:** This ensures the QoE assertion logic correctly fails when real-world playback conditions are too degraded, validating that the system detects performance issues rather than masking them.
- **Next Step:** Keep this as-is unless lenient thresholds are redefined or dynamic tolerance logic is introduced.
