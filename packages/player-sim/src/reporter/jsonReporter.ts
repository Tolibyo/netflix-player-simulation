import fs from "fs";
import path from "path";
import type { ScenarioResult } from "../scenario";

/**
 * Write ScenarioResult to a structured JSON report.
 * Creates /reports/<scenarioName>.json by default.
 */
export function writeJsonReport(result: ScenarioResult, outDir = "reports") {
  const dir = path.resolve(process.cwd(), outDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${result.name}.json`);
  const payload = {
    scenario: result.name,
    ended: result.ended,
    telemetry: result.telemetry,
    qoe: result.qoe,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
  return filePath;
}
