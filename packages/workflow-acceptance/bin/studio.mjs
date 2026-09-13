#!/usr/bin/env node
// Studio CLI -- the client-agnostic entry point for the Workflow Acceptance
// Engine. Studio's GUI and any external agent (ChatGPT Work, CI) invoke the
// exact same engine through this one CLI; see "Fundamental Architectural
// Rule" and "ChatGPT Work Compatibility" in
// docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
//
// This file is intentionally plain Node (no TypeScript, no build step) --
// it only orchestrates: resolve a workflow from the registry, compute the
// next run id, spawn the vertical's acceptance test under vitest (which is
// where the real engine code in ../src runs, with full TS/alias resolution),
// then read back the report.json that test wrote and translate it into an
// exit code. It duplicates no production logic -- it is purely glue.
//
// Exit codes: 0 PASS, 1 acceptance failure, 2 configuration/test
// infrastructure failure, 3 workflow could not execute.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPT_DIR);

function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate the mailmypdf-all repo root (no pnpm-workspace.yaml found above " + startDir + ")");
}

const REPO_ROOT = findRepoRoot(PACKAGE_DIR);
const REGISTRY_PATH = join(PACKAGE_DIR, "registry", "workflows.json");

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
}

function resolveWorkflow(workflowId) {
  const registry = loadRegistry();
  const entry = registry[workflowId];
  if (!entry) {
    const known = Object.keys(registry).join(", ") || "(none registered yet)";
    throw new CliError(2, `Unknown workflow "${workflowId}". Known workflows: ${known}`);
  }
  return {
    id: workflowId,
    ...entry,
    verticalAbsDir: join(REPO_ROOT, entry.verticalDir),
    scenariosAbsDir: join(REPO_ROOT, entry.verticalDir, entry.scenariosDir),
    runsAbsDir: join(REPO_ROOT, entry.verticalDir, entry.runsDir),
  };
}

class CliError extends Error {
  constructor(exitCode, message) {
    super(message);
    this.exitCode = exitCode;
  }
}

function listScenarioIds(scenariosAbsDir) {
  if (!existsSync(scenariosAbsDir)) return [];
  return readdirSync(scenariosAbsDir).filter((name) => {
    const full = join(scenariosAbsDir, name);
    return statSync(full).isDirectory() && existsSync(join(full, "scenario.json"));
  });
}

function nextRunId(runsAbsDir, workflowId, scenarioId) {
  const dir = join(runsAbsDir, workflowId, scenarioId);
  const existing = existsSync(dir) ? readdirSync(dir) : [];
  const max = existing
    .map((name) => Number.parseInt(name, 10))
    .filter((n) => Number.isFinite(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return String(max + 1).padStart(4, "0");
}

function runScenario(workflow, scenarioId, { verbose } = {}) {
  const runId = nextRunId(workflow.runsAbsDir, workflow.id, scenarioId);
  const env = {
    ...process.env,
    STUDIO_ACCEPTANCE_MODE: "true",
    STUDIO_RUN_ID: runId,
    STUDIO_SCENARIO: scenarioId,
  };

  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", workflow.acceptanceTestFile, "--config", workflow.acceptanceConfig],
    { cwd: workflow.verticalAbsDir, env, encoding: "utf8", stdio: verbose ? "inherit" : "pipe" },
  );

  const reportPath = join(workflow.runsAbsDir, workflow.id, scenarioId, runId, "report.json");
  if (!existsSync(reportPath)) {
    const output = verbose ? "" : `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    throw new CliError(
      3,
      `Workflow "${workflow.id}" scenario "${scenarioId}" did not produce a report ` +
        `(no report.json at ${reportPath}). The test process likely crashed before the ` +
        `engine could write it.\n\n${output}`.trim(),
    );
  }
  return JSON.parse(readFileSync(reportPath, "utf8"));
}

function printSummary(report) {
  console.log(`${report.workflow.toUpperCase()}`);
  console.log(`Acceptance Run #${report.runId} (scenario: ${report.scenario})`);
  console.log("");
  for (const [name, status] of Object.entries(report.checks)) {
    console.log(`${name.padEnd(28, " ")} ${status.toUpperCase()}`);
  }
  console.log("");
  console.log(`MAIL READY${" ".repeat(18)}${report.mailReady ? "YES" : "NO"}`);
  if (!report.mailReady && report.failures.length) {
    console.log("");
    console.log("FAILED");
    for (const failure of report.failures) {
      console.log("");
      console.log(failure.code);
      console.log(failure.message);
    }
  }
  console.log("");
  console.log(`Artifacts: ${report.artifacts.runDir}`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function main() {
  const [, , ...argv] = process.argv;
  const { positional, flags } = parseArgs(argv);
  const [group, action, ...rest] = positional;

  if (group !== "workflow") {
    console.error("Usage: studio workflow <list|inspect|scenarios|test|artifact> ...");
    process.exitCode = 2;
    return;
  }

  if (action === "list") {
    const registry = loadRegistry();
    for (const [id, entry] of Object.entries(registry)) {
      console.log(`${id}  (vertical: ${entry.vertical})`);
    }
    return;
  }

  if (action === "inspect") {
    const workflow = resolveWorkflow(rest[0]);
    console.log(JSON.stringify(workflow, null, 2));
    return;
  }

  if (action === "scenarios") {
    const workflow = resolveWorkflow(rest[0]);
    const ids = listScenarioIds(workflow.scenariosAbsDir);
    if (ids.length === 0) {
      console.log(`No scenarios yet for "${workflow.id}". See docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md#first-run-fixture-creation.`);
      return;
    }
    for (const id of ids) console.log(id);
    return;
  }

  if (action === "test") {
    const workflow = resolveWorkflow(rest[0]);
    const asJson = Boolean(flags.json);
    const verbose = Boolean(flags.verbose) && !asJson;

    let scenarioIds;
    if (flags["all-scenarios"]) {
      scenarioIds = listScenarioIds(workflow.scenariosAbsDir);
      if (scenarioIds.length === 0) {
        throw new CliError(2, `No scenarios exist yet for "${workflow.id}".`);
      }
    } else if (flags.fixture) {
      scenarioIds = [flags.fixture];
    } else {
      const available = listScenarioIds(workflow.scenariosAbsDir);
      if (available.length === 1) {
        scenarioIds = available;
      } else if (available.length === 0) {
        throw new CliError(
          2,
          `No fixture exists yet for "${workflow.id}". Create one under ` +
            `${workflow.scenariosAbsDir} -- see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md#first-run-fixture-creation.`,
        );
      } else {
        throw new CliError(
          2,
          `Multiple scenarios exist for "${workflow.id}" (${available.join(", ")}). ` +
            `Pass --fixture <scenario> or --all-scenarios.`,
        );
      }
    }

    const reports = scenarioIds.map((scenarioId) => runScenario(workflow, scenarioId, { verbose }));

    if (asJson) {
      console.log(JSON.stringify(reports.length === 1 ? reports[0] : { workflow: workflow.id, scenarios: reports }, null, 2));
    } else {
      for (const report of reports) {
        printSummary(report);
        console.log("");
      }
      if (reports.length > 1) {
        const overall = reports.every((r) => r.mailReady) ? "PASS" : "FAIL";
        console.log(`Overall: ${overall}`);
      }
    }

    const allPassed = reports.every((r) => r.mailReady);
    process.exitCode = allPassed ? 0 : 1;
    return;
  }

  console.error(`Unknown action "${action}". Usage: studio workflow <list|inspect|scenarios|test|artifact> ...`);
  process.exitCode = 2;
}

try {
  main();
} catch (error) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
  } else {
    console.error(error?.stack || String(error));
    process.exitCode = 2;
  }
}
