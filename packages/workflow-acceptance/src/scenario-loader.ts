import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { LoadedScenario, Scenario, ScenarioExpectations } from "./types.js";

export class ScenarioNotFoundError extends Error {}
export class ScenarioInvalidError extends Error {}

/**
 * Loads a scenario from <scenariosDir>/<scenarioId>/{scenario.json,
 * expected.json, uploads/*}. See build-specs and
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md for the on-disk layout.
 */
export function loadScenario(scenariosDir: string, scenarioId: string): LoadedScenario {
  const dir = join(scenariosDir, scenarioId);
  const scenarioPath = join(dir, "scenario.json");
  if (!existsSync(scenarioPath)) {
    throw new ScenarioNotFoundError(
      `No fixture exists for scenario "${scenarioId}" (expected ${scenarioPath}). ` +
        `Create it, or generate one -- see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md#first-run-fixture-creation.`,
    );
  }

  let scenario: Scenario;
  try {
    scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
  } catch (error) {
    throw new ScenarioInvalidError(`${scenarioPath} is not valid JSON: ${(error as Error).message}`);
  }

  let expected: ScenarioExpectations = {};
  const expectedPath = join(dir, "expected.json");
  if (existsSync(expectedPath)) {
    try {
      expected = JSON.parse(readFileSync(expectedPath, "utf8"));
    } catch (error) {
      throw new ScenarioInvalidError(`${expectedPath} is not valid JSON: ${(error as Error).message}`);
    }
  }

  const uploadsDir = join(dir, "uploads");
  const uploadPaths: Record<string, string> = {};
  for (const upload of scenario.uploads ?? []) {
    const uploadPath = join(uploadsDir, upload.file);
    if (!existsSync(uploadPath)) {
      throw new ScenarioInvalidError(
        `Scenario "${scenarioId}" references upload "${upload.file}" (id: ${upload.id}) which does not exist at ${uploadPath}`,
      );
    }
    uploadPaths[upload.id] = uploadPath;
  }

  return { scenario, expected, uploadPaths };
}

/** Lists every scenario id available for a workflow (subdirectories with a scenario.json). */
export function listScenarios(scenariosDir: string): string[] {
  if (!existsSync(scenariosDir)) return [];
  return readdirSync(scenariosDir).filter((name) => {
    const full = join(scenariosDir, name);
    return statSync(full).isDirectory() && existsSync(join(full, "scenario.json"));
  });
}
