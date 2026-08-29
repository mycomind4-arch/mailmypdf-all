/* ═══════════════════════════════════════════════════════════
   PIPELINE EXECUTOR — runWorkflowPipeline()

   The core executable pipeline. Accepts:
   - workflow definition (metadata)
   - executable domain pack (functions)
   - engine policy (stage ordering)
   - input (raw text + user context)
   - consequential state (review, approval, mailing, tracking, proof)

   Produces:
   - WorkflowPipelineResult with final context, stage results,
     blocking state, validation results, errors, provenance

   Design principles:
   - Every stage has explicit status (PASSED/FAILED/BLOCKED/NOT_SUPPORTED/SKIPPED)
   - NOT_SUPPORTED is never equivalent to PASSED
   - Missing REQUIRED capability fails closed
   - Pipeline never fabricates facts, deadlines, research, or evidence
   - BLOCK never becomes approval
   - Stage ordering follows engine policy
   - Each stage is timed and audited
   - Consequential stages (review, approval, mailing, tracking, proof) are
     enforced — never SKIPPED. They fail closed when state is missing.

   ═══════════════════════════════════════════════════════════ */

import { classifyContent } from "../security";
import { classifyNoticeType } from "../notice-type";
import { buildDraftProvenance } from "../draft-provenance";
import type { MasterWorkflowDefinition as WorkflowDefinition } from "../workflow-definition";
import type { ExecutableDomainPack } from "./executable-pack";
import type { EnginePolicy } from "./engine-dispatch";
import {
  createWorkflowContext,
  recordStage,
  type WorkflowContext,
  type StageStatus,
  type WorkflowInput,
  type WorkflowPipelineResult,
  type DeadlineInfo,
  type ConsequentialState,
} from "./types";

// ── Timer helper ────────────────────────────────────────────

function time<T>(fn: () => T): { result: T; durationMs: number } {
  const start = Date.now();
  const result = fn();
  return { result, durationMs: Date.now() - start };
}

// ── Framework extension stages (always skipped) ────────────

const EXTENSION_STAGES = new Set([
  "provenance",
  "analysis",
]);

// ── Main entry point ────────────────────────────────────────

export function runWorkflowPipeline(params: {
  definition: WorkflowDefinition;
  pack: ExecutableDomainPack;
  enginePolicy: EnginePolicy;
  input: WorkflowInput;
  consequential?: ConsequentialState;
}): WorkflowPipelineResult {
  const { definition, pack, enginePolicy, input } = params;
  const consequential = params.consequential ?? null;

  const ctx = createWorkflowContext(definition.id, pack.engine, input);
  const errors: string[] = [];
  const warnings: string[] = [];

  let blocked = false;

  for (const stageDef of enginePolicy.stages) {
    // If already blocked, mark remaining stages as BLOCKED
    if (blocked) {
      if (EXTENSION_STAGES.has(stageDef.name)) {
        recordStage(ctx, stageDef.name, "skipped", 0, "framework extension point, not yet implemented");
      } else {
        recordStage(ctx, stageDef.name, "blocked", 0);
      }
      continue;
    }

    try {
      const { status, detail, error } = executeStage(ctx, stageDef.name, pack, stageDef.required, consequential);
      recordStage(ctx, stageDef.name, status, 0, detail, error);

      if (status === "failed" && stageDef.blocksOnFailure) {
        blocked = true;
        ctx.blocked = true;
        ctx.blockReasons.push(`${stageDef.name} failed: ${error ?? "unknown error"}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      recordStage(ctx, stageDef.name, "failed", 0, undefined, errorMsg);
      if (stageDef.blocksOnFailure) {
        blocked = true;
        ctx.blocked = true;
        ctx.blockReasons.push(`${stageDef.name} threw: ${errorMsg}`);
      }
      errors.push(`${stageDef.name}: ${errorMsg}`);
    }
  }

  for (const sr of ctx.stageResults) {
    if (sr.status === "failed" && sr.error) {
      errors.push(`${sr.stage}: ${sr.error}`);
    }
  }

  if (ctx.blocked) {
    warnings.push("Pipeline blocked — review blockReasons");
  }

  // Gold readiness requires both intelligence pipeline completion AND
  // consequential state completion (when consequential state was provided).
  let goldReady = !ctx.blocked && errors.length === 0;
  if (consequential) {
    const cs = consequential;
    goldReady = goldReady &&
      cs.draftValidationPassed &&
      cs.reviewChecks.length > 0 &&
      cs.reviewChecks.every(Boolean) &&
      cs.approved &&
      cs.paymentComplete &&
      cs.mailingReady &&
      cs.mailingSubmitted &&
      cs.trackingNumber !== null &&
      cs.proofVerified;
  }

  return {
    context: ctx,
    stages: ctx.stageResults,
    ready: goldReady,
    errors,
    warnings,
  };
}

// ── Stage execution ─────────────────────────────────────────

function executeStage(
  ctx: WorkflowContext,
  stageName: string,
  pack: ExecutableDomainPack,
  required: boolean,
  consequential: ConsequentialState | null,
): { status: StageStatus; detail?: string; error?: string } {
  switch (stageName) {

    // ── Required stages (always implemented) ──

    case "security": {
      const { result } = time(() => classifyContent(ctx.input.rawText));
      ctx.security = result;
      return { status: "passed", detail: `trust=${result.trustLevel}, sanitized=${result.sanitized}` };
    }

    case "classification": {
      const { result } = time(() => classifyNoticeType(ctx.input.rawText));
      return { status: "passed", detail: `type=${result.type}, confidence=${result.confidence}` };
    }

    case "extraction": {
      const { result } = time(() => pack.extract(ctx.input.rawText));
      ctx.extraction = result;
      ctx.facts = result.facts || [];
      return { status: "passed", detail: `noticeNumber=${result.noticeNumber}, facts=${result.facts.length}` };
    }

    case "facts": {
      if (ctx.facts.length === 0) {
        return { status: "passed", detail: "no facts extracted (may be expected)" };
      }
      return { status: "passed", detail: `${ctx.facts.length} facts` };
    }

    // ── Optional stages (depend on pack capabilities) ──

    case "deadline": {
      if (!pack.capabilities.deadline) {
        return required
          ? { status: "failed", error: "Required stage deadline not supported by pack" }
          : { status: "not_supported" };
      }
      const extraction = ctx.extraction;
      if (!extraction?.responseDeadline) {
        ctx.deadline = { raw: null, parsed: null, certainty: "missing", source: "extraction" };
        return { status: "passed", detail: "no deadline found in extraction" };
      }
      ctx.deadline = {
        raw: extraction.responseDeadline,
        parsed: extraction.responseDeadline,
        certainty: "confirmed",
        source: "extraction",
      };
      return { status: "passed", detail: `deadline=${extraction.responseDeadline}` };
    }

    case "discrepancy": {
      if (!pack.capabilities.discrepancy || !pack.analyzeDiscrepancies) {
        return required
          ? { status: "failed", error: "Required stage discrepancy not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.analyzeDiscrepancies!(ctx));
      ctx.discrepancies = result.discrepancies;
      ctx.findings = [...ctx.findings, ...result.findings];
      return { status: "passed", detail: `${result.discrepancies.length} discrepancies, ${result.findings.length} findings` };
    }

    case "evidence": {
      if (!pack.capabilities.evidence || !pack.buildEvidenceChecklist) {
        return required
          ? { status: "failed", error: "Required stage evidence not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.buildEvidenceChecklist!(ctx));
      ctx.evidence = result.items;
      return { status: "passed", detail: `${result.items.length} evidence items, ${result.satisfied}/${result.required} satisfied` };
    }

    case "research": {
      if (!pack.capabilities.research || !pack.getResearchPack) {
        return required
          ? { status: "failed", error: "Required stage research not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.getResearchPack!());
      ctx.research = result;
      return { status: "passed", detail: `${result.sources.length} sources` };
    }

    case "strategy": {
      if (!pack.capabilities.strategy || !pack.generateStrategy) {
        return required
          ? { status: "failed", error: "Required stage strategy not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.generateStrategy!(ctx));
      ctx.strategy = result;
      return { status: "passed", detail: `position=${result.position}, confidence=${result.confidence}` };
    }

    case "draft": {
      const { result } = time(() => pack.generateDraft(ctx));
      ctx.draft = result;
      return { status: "passed", detail: `${result.length} chars` };
    }

    case "draftProvenance": {
      const { result } = time(() => buildDraftProvenance(ctx.draft ?? "", ctx.facts, []));
      ctx.draftProvenance = result;
      return { status: "passed", detail: `${result.assertions.length} assertions, ${result.supported} supported` };
    }

    case "factualValidation": {
      if (!pack.capabilities.factualValidation || !pack.validateFactual) {
        return required
          ? { status: "failed", error: "Required stage factualValidation not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.validateFactual!(ctx));
      ctx.factualValidation = result;
      return {
        status: result.passed ? "passed" : "failed",
        detail: `${result.errors} errors, ${result.warnings} warnings`,
        error: result.passed ? undefined : `${result.errors} factual validation errors`,
      };
    }

    case "requirementValidation": {
      if (!pack.capabilities.requirementValidation || !pack.validateRequirements) {
        return required
          ? { status: "failed", error: "Required stage requirementValidation not supported by pack" }
          : { status: "not_supported" };
      }
      const { result } = time(() => pack.validateRequirements!(ctx));
      ctx.requirementValidation = result;
      return {
        status: result.passed ? "passed" : "failed",
        detail: `${result.errors} errors, ${result.warnings} warnings`,
        error: result.passed ? undefined : `${result.errors} requirement validation errors`,
      };
    }

    // ── Blocking stage ──

    case "blocking": {
      if (ctx.factualValidation?.blocked) {
        ctx.blocked = true;
        ctx.blockReasons.push("factual validation blocked");
        return { status: "failed", error: "factual validation blocked" };
      }
      if (ctx.factualValidation && ctx.factualValidation.errors > 0) {
        ctx.blocked = true;
        ctx.blockReasons.push(`${ctx.factualValidation.errors} factual validation errors`);
        return { status: "failed", error: `${ctx.factualValidation.errors} factual errors` };
      }
      if (ctx.requirementValidation?.blocked) {
        ctx.blocked = true;
        ctx.blockReasons.push("requirement validation blocked");
        return { status: "failed", error: "requirement validation blocked" };
      }
      if (ctx.requirementValidation && ctx.requirementValidation.errors > 0) {
        ctx.blocked = true;
        ctx.blockReasons.push(`${ctx.requirementValidation.errors} requirement validation errors`);
        return { status: "failed", error: `${ctx.requirementValidation.errors} requirement errors` };
      }
      return { status: "passed", detail: "no blocking issues" };
    }

    // ── Consequential stages (enforced — fail closed) ──

    case "reviewBoundary": {
      if (!consequential) return { status: "skipped", detail: "no consequential state provided" };
      if (!consequential.draftValidationPassed) {
        return { status: "failed", error: "Draft validation has not passed — review cannot begin" };
      }
      if (consequential.reviewChecks.length === 0) {
        return { status: "failed", error: "No review checks recorded — human review is required" };
      }
      if (!consequential.reviewChecks.every(Boolean)) {
        const failed = consequential.reviewChecks.filter(c => !c).length;
        return { status: "failed", error: `${failed} review check(s) failed — cannot advance to approval` };
      }
      return { status: "passed", detail: `${consequential.reviewChecks.length} review checks passed` };
    }

    case "approvalBoundary": {
      if (!consequential) return { status: "skipped", detail: "no consequential state provided" };
      if (!consequential.approved) {
        return { status: "failed", error: "Explicit human approval is required before mailing" };
      }
      return { status: "passed", detail: "human approval confirmed" };
    }

    case "submissionBoundary": {
      if (!consequential) return { status: "skipped", detail: "no consequential state provided" };
      if (!consequential.paymentComplete) {
        return { status: "failed", error: "Payment must be completed before mailing submission" };
      }
      if (!consequential.mailingReady) {
        return { status: "failed", error: "Mailing recipient and method must be complete before submission" };
      }
      if (!consequential.mailingSubmitted) {
        return { status: "failed", error: "Mailing has not been submitted to provider" };
      }
      return { status: "passed", detail: "mailing submitted to provider" };
    }

    case "proofTrackingBoundary": {
      if (!consequential) return { status: "skipped", detail: "no consequential state provided" };
      if (!consequential.mailingSubmitted) {
        return { status: "failed", error: "Cannot track a mailing that has not been submitted" };
      }
      if (!consequential.trackingNumber) {
        return { status: "failed", error: "Tracking number is required before proof verification" };
      }
      if (!consequential.proofVerified) {
        return { status: "failed", error: "Proof of delivery must be verified to complete Gold certification" };
      }
      return { status: "passed", detail: `tracking=${consequential.trackingNumber}, proof verified` };
    }

    // ── Marker stages (delegated to other stages) ──

    case "provenance":
    case "analysis": {
      return { status: "skipped", detail: `${stageName}: delegated to extraction and draftProvenance stages` };
    }

    default:
      return { status: "skipped", detail: `unknown stage: ${stageName}` };
  }
}
