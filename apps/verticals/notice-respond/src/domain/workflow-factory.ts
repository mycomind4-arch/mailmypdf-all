/* ═══════════════════════════════════════════════════════════
   WORKFLOW FACTORY — assembles a runnable workflow from a
   WorkflowDefinition + Domain Pack Set.

   Pipeline:
   WorkflowDefinition
       ↓
   validate definition
       ↓
   resolve engine
       ↓
   load capability packs
       ↓
   construct workflow (attach all pack configurations)
       ↓
   run workflow

   The factory does NOT execute AI calls. It constructs
   the contract and validates that all required pieces
   are present. Execution is handled by the workflow runtime.

   ═══════════════════════════════════════════════════════════ */

import type {
  MasterWorkflowDefinition,
  WorkflowEngine,
  CapabilityPack,
} from "./workflow-definition";
import { ENGINE_REGISTRY } from "./workflow-definition";
import type { DomainPackSet } from "./domain-packs";
import { getDomainPack } from "./domain-packs";

// ── Factory Result ────────────────────────────────────────────

export interface ConstructedWorkflow {
  definition: MasterWorkflowDefinition;
  engine: WorkflowEngine;
  packs: DomainPackSet | undefined;
  capabilities: CapabilityPack[];
  warnings: string[];
  errors: string[];
  ready: boolean;
}

// ── Factory Pipeline ──────────────────────────────────────────

export function validateDefinition(def: MasterWorkflowDefinition): string[] {
  const errors: string[] = [];

  if (!def.id) errors.push("Missing workflow id");
  if (!def.vertical) errors.push("Missing vertical");
  if (!def.title) errors.push("Missing title");
  if (!def.engine) errors.push("Missing engine");
  if (!def.searchIntent?.canonicalPath) errors.push("Missing canonical search path");
  if (!def.searchIntent?.primary) errors.push("Missing primary search intent");
  if (!def.documents?.length) errors.push("No document definitions");
  if (!def.deadlines?.length) errors.push("No deadline definitions");
  if (!def.requirements?.length) errors.push("No requirement definitions");
  if (!def.analysis?.capabilities?.length) errors.push("No analysis capabilities");
  if (!def.drafting?.requiredSections?.length) errors.push("No draft sections");
  if (!def.submission?.methods?.length) errors.push("No submission methods");

  return errors;
}

export function resolveEngine(def: MasterWorkflowDefinition): WorkflowEngine | null {
  if (!def.engine) return null;
  if (!ENGINE_REGISTRY[def.engine]) return null;
  return def.engine;
}

export function loadCapabilityPacks(def: MasterWorkflowDefinition): CapabilityPack[] {
  // Start with engine's shared capabilities
  const engine = ENGINE_REGISTRY[def.engine];
  if (!engine) return [];

  const capabilities = new Set<CapabilityPack>(engine.sharedCapabilities);

  // Add workflow-specific capabilities from definition
  for (const cap of def.capabilities || []) {
    capabilities.add(cap);
  }

  // Add capabilities from analysis plan
  for (const cap of def.analysis?.capabilities || []) {
    capabilities.add(cap);
  }

  return Array.from(capabilities);
}

export function constructWorkflow(def: MasterWorkflowDefinition): ConstructedWorkflow {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Step 1: Validate definition
  const validationErrors = validateDefinition(def);
  errors.push(...validationErrors);

  // Step 2: Resolve engine
  const engine = resolveEngine(def);
  if (!engine) {
    errors.push(`Cannot resolve engine: ${def.engine}`);
  }

  // Step 3: Load capability packs
  const capabilities = engine ? loadCapabilityPacks(def) : [];

  // Step 4: Load domain pack set
  const packs = getDomainPack(def.id);
  if (!packs) {
    warnings.push(`No domain pack set registered for ${def.id} — using definition defaults`);
  } else {
    if (packs.engine !== def.engine) {
      warnings.push(`Domain pack engine (${packs.engine}) does not match definition engine (${def.engine})`);
    }
  }

  // Step 5: Check maturity claims
  if (def.lifecycle === "authority") {
    for (const [gate, value] of Object.entries(def.qualityGate || {})) {
      if (!value) {
        errors.push(`Authority workflow ${def.id} has quality gate "${gate}" not satisfied`);
      }
    }
  }

  if (def.lifecycle === "blueprint") {
    if (def.qualityGate?.documentRecognition) {
      warnings.push(`Blueprint workflow ${def.id} claims document recognition — should be false`);
    }
  }

  return {
    definition: def,
    engine: engine || def.engine,
    packs,
    capabilities,
    warnings,
    errors,
    ready: errors.length === 0,
  };
}

// ── Batch Construction ────────────────────────────────────────

export function constructAllWorkflows(
  definitions: MasterWorkflowDefinition[],
): ConstructedWorkflow[] {
  return definitions.map(constructWorkflow);
}

// ── Factory Validation Summary ────────────────────────────────

export function factoryValidationSummary(workflows: ConstructedWorkflow[]): {
  total: number;
  ready: number;
  withErrors: number;
  withWarnings: number;
  errors: { workflowId: string; errors: string[] }[];
  warnings: { workflowId: string; warnings: string[] }[];
} {
  return {
    total: workflows.length,
    ready: workflows.filter((w) => w.ready).length,
    withErrors: workflows.filter((w) => w.errors.length > 0).length,
    withWarnings: workflows.filter((w) => w.warnings.length > 0).length,
    errors: workflows
      .filter((w) => w.errors.length > 0)
      .map((w) => ({ workflowId: w.definition.id, errors: w.errors })),
    warnings: workflows
      .filter((w) => w.warnings.length > 0)
      .map((w) => ({ workflowId: w.definition.id, warnings: w.warnings })),
  };
}
