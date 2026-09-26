#!/usr/bin/env node
// Enforces the rule in AGENTS.md: workflow execution UI must reuse
// @mailmypdf/step-workflow, not a new bespoke one-off component. See
// AGENTS.md "HARD RULE: workflow execution UI is @mailmypdf/step-workflow"
// and context/CURRENT_WORK.md "Execution architecture: step-workflow is the
// standard, not legacy" for why this exists.
//
// This script is the source of truth, not prose elsewhere — if a workflow's
// start/ directory is real (not just a .gitkeep placeholder) and doesn't
// reference @mailmypdf/step-workflow anywhere reachable from it, this fails
// UNLESS the workflow is on KNOWN_LEGACY_NON_STEP_WORKFLOW below, which is
// the explicit, dated inventory of pre-existing violations flagged for a
// separate consolidation effort (see the "Consolidate bespoke workflow UIs
// onto step-workflow" task). Do not add a new workflow to that allowlist to
// make this script pass — fix the workflow instead. Only the consolidation
// effort should ever remove entries from it.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Dated 2026-09-23. Each entry is a workflow whose start/ execution UI was
// already built as a bespoke one-off component before this check existed.
// Remove an entry only when it has actually been migrated onto step-workflow
// and verified (tsc/build/tests), not to silence this script.
const KNOWN_LEGACY_NON_STEP_WORKFLOW = new Set([
  // appeal-mail: InsuranceAppealWorkflow.tsx's 11 insurance-appeal ids were
  // migrated onto real @mailmypdf/step-workflow execution (useStepWorkflowMatter)
  // 2026-09-26 and verified (tsc, mailmypdf build + routeTree.gen.ts, tests) —
  // removed from this allowlist. appeal-ssdi-denial/appeal-ssi-denial remain:
  // they are a separate, fully custom implementation, not yet migrated.
  "appeal-mail/appeal-ssdi-denial",
  "appeal-mail/appeal-ssi-denial",
  // notice-respond: NoticeResponseWorkflow.tsx
  "notice-respond/cp14-response",
  "notice-respond/cp504-response",
  "notice-respond/cp2000-response",
  "notice-respond/irs-balance-due-notice-response",
  "notice-respond/irs-penalty-notice-response",
  // records-request: RecordsRequestWorkflow.tsx
  "records-request/agency-records-request",
  "records-request/government-documents-request",
  "records-request/open-records-request",
  "records-request/public-information-request",
  "records-request/public-records-request",
  // secured-transactions: SecuredTransactionWorkflowStartScaffold.tsx (14) +
  // 2 custom intakes. secured-transaction-eligibility is NOT here — it
  // already uses step-workflow correctly and is the reference example.
  "secured-transactions/amendment-continuation-assignment-termination",
  "secured-transactions/attachment-certification",
  "secured-transactions/collateral-ownership-classification",
  "secured-transactions/first-priority-determination",
  "secured-transactions/governing-law-filing-jurisdiction",
  "secured-transactions/name-capacity-resolution",
  "secured-transactions/obligation-value",
  "secured-transactions/perfection-execution",
  "secured-transactions/perfection-method-selection",
  "secured-transactions/post-perfection-verification",
  "secured-transactions/pre-filing-lien-priority-search",
  "secured-transactions/priority-preservation-monitoring",
  "secured-transactions/priority-remediation",
  "secured-transactions/priority-strategy",
  "secured-transactions/security-agreement-generation",
  "secured-transactions/ucc1-preparation-authorization",
  // immigration-mail: bespoke cover-letter implementation, found by this
  // script's first run rather than by any prior audit.
  "immigration-mail/immigration-filing-cover-letter",
]);

const STEP_WORKFLOW_MARKER = "@mailmypdf/step-workflow";
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function listVerticals() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      try {
        return statSync(join(ROOT, name, "workflows")).isDirectory();
      } catch {
        return false;
      }
    });
}

function walkFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (CODE_EXT.has(entry.name.slice(entry.name.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

function isRealStartDir(startDir) {
  const files = walkFiles(startDir);
  // A directory with only .gitkeep (no code files) is unbuilt, not a
  // bespoke-component violation — that's a separate "still needs building"
  // problem, not what this check enforces.
  return files.length > 0;
}

function referencesStepWorkflow(...dirs) {
  for (const dir of dirs) {
    for (const file of walkFiles(dir)) {
      let content;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (content.includes(STEP_WORKFLOW_MARKER)) return true;
    }
  }
  return false;
}

const failures = [];
const skippedUnbuilt = [];
const passed = [];

for (const vertical of listVerticals()) {
  const workflowsDir = join(ROOT, vertical, "workflows");
  let workflowIds;
  try {
    workflowIds = readdirSync(workflowsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    continue;
  }

  for (const id of workflowIds) {
    const startDir = join(workflowsDir, id, "start");
    let hasStart;
    try {
      hasStart = statSync(startDir).isDirectory();
    } catch {
      hasStart = false;
    }
    if (!hasStart) continue;
    if (!isRealStartDir(startDir)) {
      skippedUnbuilt.push(`${vertical}/${id}`);
      continue;
    }

    const key = `${vertical}/${id}`;
    const sharedDir = join(ROOT, vertical, "shared");
    const usesStepWorkflow = referencesStepWorkflow(startDir, sharedDir);

    if (usesStepWorkflow) {
      passed.push(key);
      continue;
    }
    if (KNOWN_LEGACY_NON_STEP_WORKFLOW.has(key)) {
      continue; // known, allowlisted, tracked for consolidation
    }
    failures.push(key);
  }
}

console.log(`step-workflow check: ${passed.length} using step-workflow, ` +
  `${KNOWN_LEGACY_NON_STEP_WORKFLOW.size} known legacy (allowlisted), ` +
  `${skippedUnbuilt.length} unbuilt (skipped), ${failures.length} NEW violations.`);

if (failures.length > 0) {
  console.error("\nFAIL — these workflows have a real start/ implementation");
  console.error("that does NOT use @mailmypdf/step-workflow and are not on");
  console.error("the known-legacy allowlist. Fix the implementation to reuse");
  console.error("step-workflow (see the port-workflow skill), or if this is");
  console.error("a genuine consolidation of a legacy entry, get its removal");
  console.error("from the allowlist reviewed:\n");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("PASS");
