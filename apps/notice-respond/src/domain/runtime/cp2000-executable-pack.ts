/* ═══════════════════════════════════════════════════════════
   CP2000 EXECUTABLE PACK — adapts the existing CP2000 domain
   modules to the ExecutableDomainPack contract.

   This is an ADAPTER, not a reimplementation. Every function
   delegates to the existing, tested CP2000 domain logic:
   - extract → extractCP2000()
   - analyzeDiscrepancies → analyzeCP2000Discrepancies()
   - buildEvidenceChecklist → buildCP2000EvidenceChecklist()
   - getResearchPack → getCP2000ResearchPack()
   - generateStrategy → generateCP2000Strategy()
   - generateDraft → generateCP2000Draft()
   - validateFactual → validateFactualConsistency()
   - validateRequirements → validateCP2000Draft()

   The pack is registered through the central registry.

   NOTE: Some functions re-extract from the raw text because the
   shared BaseExtraction type does not carry CP2000-specific fields
   like taxYear, proposedTaxIncrease, etc. This is a known trade-off
   of the adapter approach — the alternative would be to widen
   BaseExtraction or carry the full extraction in a side channel.
   Both are acceptable; re-extraction is deterministic and the
   extraction function is pure (no side effects).

   ═══════════════════════════════════════════════════════════ */

import { extractCP2000, generateCP2000Draft } from "../cp2000";
import { analyzeCP2000Discrepancies, type Discrepancy as CP2000Discrepancy } from "../cp2000-discrepancy";
import { buildCP2000EvidenceChecklist, type EvidenceChecklistItem as CP2000EvidenceItem } from "../cp2000-evidence";
import { getCP2000ResearchPack } from "../cp2000-research";
import { generateCP2000Strategy } from "../cp2000-strategy";
import { validateFactualConsistency, validateCP2000Draft } from "../cp2000-validation";
import { createCP2000Case, setCaseAnalysis, setCaseStrategy, setCaseDraft, type CP2000Case } from "../cp2000-case";
import { cp2000PackSet } from "../cp2000-packs";
import type { ResponseDraft } from "../response";

import { registerExecutablePack } from "./pack-registry";
import type { ExecutableDomainPack } from "./executable-pack";
import type {
  BaseExtraction,
  WorkflowContext,
  DiscrepancyAnalysisResult,
  EvidenceChecklistResult,
  ValidationResult,
  ResponseStrategy,
  ValidationFinding,
  Discrepancy as RuntimeDiscrepancy,
  EvidenceChecklistItem as RuntimeEvidenceItem,
} from "./types";
import type { CP2000Extraction } from "../cp2000";

// ── Adapter: CP2000Extraction → BaseExtraction ──────────────

function toBaseExtraction(extraction: CP2000Extraction): BaseExtraction {
  return {
    noticeNumber: extraction.noticeNumber,
    noticeDate: extraction.noticeDate,
    responseDeadline: extraction.responseDeadline,
    facts: extraction.facts,
    warnings: extraction.warnings,
    classificationConfidence: extraction.classificationConfidence,
  };
}

// ── Adapter: CP2000 Discrepancy → Runtime Discrepancy ───────

function toRuntimeDiscrepancy(d: CP2000Discrepancy): RuntimeDiscrepancy {
  return {
    id: d.id,
    type: d.type,
    description: d.description,
    noticeValue: d.irsAmount,
    userValue: d.userAmount,
    severity: d.confidence === "high" ? "high" : d.confidence === "medium" ? "medium" : "low",
    status: d.status,
    explanation: d.possibleExplanations.join("; "),
  };
}

// ── Adapter: CP2000 EvidenceState → Runtime state ──

function mapEvidenceState(state: CP2000EvidenceItem["state"]): RuntimeEvidenceItem["state"] {
  switch (state) {
    case "missing": return "not_provided";
    case "provided": return "provided";
    case "under_review": return "not_provided";
    case "verified": return "provided";
    case "rejected": return "not_provided";
    default: return "not_provided";
  }
}

// ── Adapter: CP2000 EvidenceChecklistItem → Runtime ─────────

function toRuntimeEvidenceItem(item: CP2000EvidenceItem): RuntimeEvidenceItem {
  return {
    id: item.id,
    label: item.label,
    requirement: item.requirement,
    state: mapEvidenceState(item.state),
    description: item.purpose,
    relatedDiscrepancyIds: item.supportsDiscrepancies,
  };
}

// ── Helper: re-extract full CP2000 from context ──────────────

function fullExtraction(ctx: WorkflowContext): CP2000Extraction {
  return extractCP2000(ctx.input.rawText);
}

// ── Helper: CP2000ValidationFinding → ValidationFinding ─────

function toValidationFinding(f: {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
  validator: "factual" | "requirement";
}): ValidationFinding {
  return {
    check: f.check,
    passed: f.passed,
    detail: f.detail,
    severity: f.severity,
    validator: f.validator,
  };
}

// ── Build CP2000 executable pack ─────────────────────────────

export function createCP2000ExecutablePack(): ExecutableDomainPack {
  return {
    workflowId: "cp2000-response",
    engine: "document-action",
    config: cp2000PackSet,

    capabilities: {
      security: true,
      extraction: true,
      classification: true,
      deadline: true,
      discrepancy: true,
      evidence: true,
      research: true,
      strategy: true,
      draft: true,
      factualValidation: true,
      requirementValidation: true,
    },

    // ── Required functions ──

    extract: (text: string): BaseExtraction => {
      const cp2000Extraction = extractCP2000(text);
      return toBaseExtraction(cp2000Extraction);
    },

    generateDraft: (ctx: WorkflowContext): string => {
      // Re-extract to get taxYear and other CP2000-specific fields
      const ext = fullExtraction(ctx);
      return generateCP2000Draft({
        noticeNumber: ext.noticeNumber ?? "",
        taxYear: ext.taxYear,
        noticeDate: ext.noticeDate,
        responseDeadline: ext.responseDeadline,
        userFacts: ctx.input.userFacts ?? "",
        userObjective: ctx.input.userObjective ?? "",
      });
    },

    // ── Optional functions ──

    analyzeDiscrepancies: (ctx: WorkflowContext): DiscrepancyAnalysisResult => {
      const ext = fullExtraction(ctx);
      const result = analyzeCP2000Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      return {
        discrepancies: result.discrepancies.map(toRuntimeDiscrepancy),
        findings: result.findings,
      };
    },

    buildEvidenceChecklist: (ctx: WorkflowContext): EvidenceChecklistResult => {
      const ext = fullExtraction(ctx);
      const discResult = analyzeCP2000Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP2000EvidenceChecklist({
        extraction: ext,
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
      });
      return {
        items: evidenceResult.items.map(toRuntimeEvidenceItem),
        satisfied: evidenceResult.verifiedCount,
        required: evidenceResult.requiredCount,
        provided: evidenceResult.providedCount,
        missing: evidenceResult.missingCount,
        allRequiredSatisfied: evidenceResult.ready,
      };
    },

    getResearchPack: () => {
      return getCP2000ResearchPack();
    },

    generateStrategy: (ctx: WorkflowContext): ResponseStrategy => {
      const ext = fullExtraction(ctx);
      const discResult = analyzeCP2000Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP2000EvidenceChecklist({
        extraction: ext,
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
      });
      const strategy = generateCP2000Strategy({
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
        evidence: evidenceResult.items,
        userFacts: ctx.input.userFacts ?? null,
        userObjective: ctx.input.userObjective ?? null,
        hasDeadline: !!ext.responseDeadline,
        extractionConfident: ext.classificationConfidence >= 0.7,
      });
      return {
        position: strategy.position,
        rationale: strategy.issues.join("; "),
        recommendedActions: strategy.requestedActions,
        warnings: strategy.riskFlags,
        confidence: strategy.confidence,
      };
    },

    validateFactual: (ctx: WorkflowContext): ValidationResult => {
      const ext = fullExtraction(ctx);
      const discResult = analyzeCP2000Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const draft = ctx.draft ?? "";
      const factualFindings = validateFactualConsistency(
        draft,
        ext,
        discResult.discrepancies,
        ctx.input.userFacts ?? null,
      );
      const errorCount = factualFindings.filter(f => f.severity === "error" && !f.passed).length;
      const warningCount = factualFindings.filter(f => f.severity === "warning" && !f.passed).length;
      const hasErrors = errorCount > 0;
      return {
        factualFindings: factualFindings.map(toValidationFinding),
        requirementFindings: [],
        allFindings: factualFindings.map(toValidationFinding),
        passed: !hasErrors,
        errors: errorCount,
        warnings: warningCount,
        blocks: errorCount,
        blocked: hasErrors,
      };
    },

    validateRequirements: (ctx: WorkflowContext): ValidationResult => {
      const ext = fullExtraction(ctx);
      const discResult = analyzeCP2000Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP2000EvidenceChecklist({
        extraction: ext,
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
      });
      const strategy = generateCP2000Strategy({
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
        evidence: evidenceResult.items,
        userFacts: ctx.input.userFacts ?? null,
        userObjective: ctx.input.userObjective ?? null,
        hasDeadline: !!ext.responseDeadline,
        extractionConfident: ext.classificationConfidence >= 0.7,
      });
      // Build a CP2000Case for validateCP2000Draft
      let case_ = createCP2000Case(ext);
      case_ = setCaseAnalysis(case_, {
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
        evidence: evidenceResult.items,
      });
      case_ = setCaseStrategy(case_, strategy);
      const draftText = ctx.draft ?? "";
      const draft: ResponseDraft = {
        content: draftText,
        wordCount: draftText.split(/\s+/).filter(Boolean).length,
        unresolvedPlaceholders: [],
      };
      case_ = setCaseDraft(case_, draft);

      const result = validateCP2000Draft(case_);
      return {
        factualFindings: result.factualFindings.map(toValidationFinding),
        requirementFindings: result.requirementFindings.map(toValidationFinding),
        allFindings: result.allFindings.map(toValidationFinding),
        passed: result.passed,
        errors: result.errors,
        warnings: result.warnings,
        blocks: result.blocks,
        blocked: result.blocked,
      };
    },
  };
}

// ── Register the pack ────────────────────────────────────────

let _registered = false;

export function ensureCP2000PackRegistered(): void {
  if (!_registered) {
    registerExecutablePack(createCP2000ExecutablePack());
    _registered = true;
  }
}

// Auto-register on import (deterministic)
ensureCP2000PackRegistered();
