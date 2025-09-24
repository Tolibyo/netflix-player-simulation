# Netflix Player Simulation Framework

A TypeScript-based simulation of a streaming video player's core decision-making and playback behavior.  
This project is designed as an interview-ready demonstration of how real-world video players (like Netflix) manage playback, adapt bitrate to network conditions, and measure Quality of Experience (QoE) — without using actual media files.

---

## Purpose

The goal is to **simulate the heart of a modern streaming player**:

- How it loads and parses manifests (HLS/DASH)
- How it chooses which rendition (quality level) to play based on network conditions (ABR logic)
- How it buffers and stalls based on segment download times
- How it measures startup, rebuffering, and bitrate performance
- How it asserts whether a playback session meets QoE standards

This project is intentionally built in **tiny, incremental stages**, each captured as a commit, to reflect real-world software evolution and make every part explainable in an interview setting.

---

## Implemented So Far

### 1. Project Setup
- Initialized a TypeScript + PNPM project with Vitest for testing.
- Configured ESLint and TypeScript with Node ESM support.
- Folder structure for simulation, configs, tests, and reports.

### 2. Network Profiles
- `configs/net-profiles.json` defines network conditions (bandwidth + latency).
- Loader validates profiles and makes them available to the player.

### 3. Device Profiles
- `configs/device-profiles.json` defines device capabilities (max resolution and bitrate).
- Loader ensures device constraints are available to the system.

### 4. Fake Manifests (HLS & DASH)
- Simulated manifests with multiple renditions and segments.
- Parser reads and validates both HLS and DASH JSON and normalizes them into a common structure for downstream logic.

### 5. Telemetry Skeleton
- A metrics collector to track startup time, rebuffer count and duration, average bitrate, and quality switches.
- Provides snapshots for analysis and reporting.

### 6. Adaptive Bitrate (ABR) Logic
- Pure function `pickRendition()` selects the best quality under current bandwidth and safety margins.
- Stateful `SimpleABR` uses hysteresis: downswitches immediately when over budget, upswitches only after several consecutive good samples.
- Telemetry integration logs bitrate choices and quality switches.

### 7. Playback Loop Simulation
- Simulates segment-by-segment playback with buffer tracking.
- Calculates fetch times from bitrate, segment duration, bandwidth, and latency.
- Records rebuffer events and stall durations when buffer drains.
- Calls ABR each step to decide the next rendition based on updated conditions.

### 8. QoE Assertions
- Defines quality-of-experience thresholds in JSON (startup time, rebuffer limits, bitrate minimums, etc.).
- `assertQoE()` compares telemetry metrics against thresholds and returns structured pass/fail results.
- Unit tests cover pass/fail/skip/null scenarios.

---

## Roadmap — What’s Coming Next

### 9. Test Harness & Scenario Runner
- Scenario definitions (e.g., `vod_good_net`, `vod_poor_net`) that combine manifest, device, network, and thresholds.
- A runner that simulates full sessions and prints results.
- Structured reporter that shows metrics and assertion outcomes.

### 10. Ads Support
- Extend manifests with ad markers and simulate ad segment playback.
- Track ad-seam metrics (e.g., gap time between content and ad playback).

### 11. Live Playback Simulation
- Introduce a moving live edge.
- Track join latency and simulate catch-up logic (faster-than-real-time playback when behind).

### 12. DRM Mock
- Simulate DRM handshake delays and failure modes.
- Introduce fatal error handling for unsupported devices.

### 13. Experimentation Layer
- Add feature toggles for testing different ABR strategies and configurations.
- Compare QoE metrics across control and variant runs.

### 14. CI Integration
- GitHub Actions workflow to install, test, and upload reports.
- Status badge integration in this README.

### 15. Reports & Polish
- Markdown-based reports with scenario metrics and QoE check summaries.
- Optional ASCII/Markdown graphs for bitrate trends and rebuffer events.
- Final `ARCHITECTURE.md` explaining the internal design and decision-making.

---

## Testing

All modules are unit-tested using [Vitest](https://vitest.dev).  
Run the test suite:

```bash
pnpm test
