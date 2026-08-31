/* ═══════════════════════════════════════════════════════════
   EXECUTABLE WORKFLOW CONSTRUCTION — extends the existing
   constructWorkflow() to also resolve the executable domain pack
   and engine policy needed by runWorkflowPipeline().

   This is a thin layer over the existing factory. It does not
   replace constructWorkflow — it augments it.

   ═══════════════════════════════════════════════════════════ */

import type { MasterWorkflowDefinition } from "../workflow-definition";
import type { ExecutableDomainPack } from "./executable-pack";
import type { EnginePolicy } from "./engine-dispatch";
import { getEnginePolicy, isEngineImplemented } from "./engine-dispatch";
import { getExecutablePack, hasExecutablePack } from "./pack-registry";

// ── Executable Workflow ─────────────────────────────────────

export interface ExecutableWorkflow {
  definition: MasterWorkflowDefinition;
  pack: ExecutableDomainPack;
  enginePolicy: EnginePolicy;
  ready: boolean;
  errors: string[];
  warnings: string[];
}

// ── Construct ──────────────────────────────────────────────

export function constructExecutableWorkflow(
  definition: MasterWorkflowDefinition,
): ExecutableWorkflow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Resolve executable pack
  if (!hasExecutablePack(definition.id)) {
    errors.push(`No executable pack registered for ${definition.id}`);
    return { definition, pack: undefined as any, enginePolicy: undefined as any, ready: false, errors, warnings };
  }
  const pack = getExecutablePack(definition.id);
  if (!pack) {
    errors.push(`getExecutablePack returned null for ${definition.id}`);
    return { definition, pack: undefined as any, enginePolicy: undefined as any, ready: false, errors, warnings };
  }

  // Step 2: Validate engine match
  if (pack.engine !== definition.engine) {
    errors.push(`Pack engine (${pack.engine}) does not match definition engine (${definition.engine})`);
  }

  // Step 3: Resolve engine policy
  if (!isEngineImplemented(definition.engine)) {
    errors.push(`Engine not implemented: ${definition.engine}`);
    return { definition, pack, enginePolicy: undefined as any, ready: false, errors, warnings };
  }
  const enginePolicy = getEnginePolicy(definition.engine);
  if (!enginePolicy) {
    errors.push(`No engine policy for: ${definition.engine}`);
    return { definition, pack, enginePolicy: undefined as any, ready: false, errors, warnings };
  }

  // Step 4: Validate pack capabilities against engine required stages
  for (const stage of enginePolicy.stages) {
    if (stage.required) {
      const capKey = stage.name as keyof typeof pack.capabilities;
      if (capKey in pack.capabilities && !pack.capabilities[capKey]) {
        errors.push(`Required stage ${stage.name} not supported by pack`);
      }
    }
  }

  return {
    definition,
    pack,
    enginePolicy,
    ready: errors.length === 0,
    errors,
    warnings,
  };
}
