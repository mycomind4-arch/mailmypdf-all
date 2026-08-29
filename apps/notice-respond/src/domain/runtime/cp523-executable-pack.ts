/* ═══════════════════════════════════════════════════════════
   CP523 EXECUTABLE PACK — adapts the existing CP523 domain
   modules to the ExecutableDomainPack contract.

   This is an ADAPTER, not a reimplementation. Every function
   delegates to the existing, tested CP523 domain logic:
   - extract → extractCP523()
   - analyzeDiscrepancies → analyzeCP523Discrepancies()
   - buildEvidenceChecklist → buildCP523EvidenceChecklist()
   - getResearchPack → getCP523ResearchPack()
   - generateStrategy → generateCP523Strategy()
   - generateDraft → generateCP523Draft()
   - validateFactual → validateFactualConsistency()
   - validateRequirements → validateCP523Draft()

   The pack is registered through the central registry.

   ═══════════════════════════════════════════════════════════ */

import { extractCP523, generateCP523Draft } from "../cp523";
import { analyzeCP523Discrepancies, type Discrepancy as CP523Discrepancy } from "../cp523-discrepancy";
import { buildCP523EvidenceChecklist, type EvidenceChecklistItem as CP523EvidenceItem } from "../cp523-evidence";
import { getCP523ResearchPack } from "../cp523-research";
import { generateCP523Strategy } from "../cp523-strategy";
import { validateFactualConsistency, validateCP523Draft } from "../cp523-validation";
import type { CP523Extraction } from "../cp523";
import { cp523PackSet } from "../cp523-packs";

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

// ── Adapter: CP523Extraction → BaseExtraction ──────────────

function toBaseExtraction(extraction: CP523Extraction): BaseExtraction {
  return {
    noticeNumber: extraction.noticeNumber,
    noticeDate: extraction.noticeDate,
    responseDeadline: extraction.responseDeadline,
    facts: extraction.facts,
    warnings: extraction.warnings,
    classificationConfidence: extraction.classificationConfidence,
  };
}

// ── Adapter: CP523 Discrepancy → Runtime Discrepancy ───────

function toRuntimeDiscrepancy(d: CP523Discrepancy): RuntimeDiscrepancy {
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

// ── Adapter: CP523 EvidenceState → Runtime state ──

function mapEvidenceState(state: CP523EvidenceItem["state"]): RuntimeEvidenceItem["state"] {
  switch (state) {
    case "missing": return "not_provided";
    case "provided": return "provided";
    case "under_review": return "not_provided";
    case "verified": return "provided";
    case "rejected": return "not_provided";
    default: return "not_provided";
  }
}

// ── Adapter: CP523 EvidenceChecklistItem → Runtime ─────────

function toRuntimeEvidenceItem(item: CP523EvidenceItem): RuntimeEvidenceItem {
  return {
    id: item.id,
    label: item.label,
    requirement: item.requirement,
    state: mapEvidenceState(item.state),
    description: item.purpose,
    relatedDiscrepancyIds: item.supportsDiscrepancies,
  };
}

// ── Helper: re-extract full CP523 from context ──────────────

function fullExtraction(ctx: WorkflowContext): CP523Extraction {
  return extractCP523(ctx.input.rawText);
}

// ── Helper: CP523ValidationFinding → ValidationFinding ─────

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

// ── Build CP523 executable pack ─────────────────────────────

export function createCP523ExecutablePack(): ExecutableDomainPack {
  return {
    workflowId: "cp523-response",
    engine: "document-action",
    config: cp523PackSet,

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
      const cp523Extraction = extractCP523(text);
      return toBaseExtraction(cp523Extraction);
    },

    generateDraft: (ctx: WorkflowContext): string => {
      const ext = fullExtraction(ctx);
      return generateCP523Draft({
        noticeNumber: ext.noticeNumber ?? "",
        taxYearsCovered: ext.taxYearsCovered,
        noticeDate: ext.noticeDate,
        responseDeadline: ext.responseDeadline,
        cdpHearingDeadline: ext.cdpHearingDeadline,
        terminationDate: ext.terminationDate,
        installmentAgreementNumber: ext.installmentAgreementNumber,
        defaultReason: ext.defaultReason,
        userFacts: ctx.input.userFacts ?? "",
        userObjective: ctx.input.userObjective ?? "",
      });
    },

    // ── Optional functions ──

    analyzeDiscrepancies: (ctx: WorkflowContext): DiscrepancyAnalysisResult => {
      const ext = fullExtraction(ctx);
      const result = analyzeCP523Discrepancies({
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
      const discResult = analyzeCP523Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP523EvidenceChecklist({
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
      return getCP523ResearchPack();
    },

    generateStrategy: (ctx: WorkflowContext): ResponseStrategy => {
      const ext = fullExtraction(ctx);
      const discResult = analyzeCP523Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP523EvidenceChecklist({
        extraction: ext,
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
      });
      const strategy = generateCP523Strategy({
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
        evidence: evidenceResult.items,
        userFacts: ctx.input.userFacts ?? null,
        userObjective: ctx.input.userObjective ?? null,
        hasDeadline: !!(ext.responseDeadline || ext.cdpHearingDeadline),
        extractionConfident: ext.classificationConfidence >= 0.7,
        cdpRightsNotice: ext.cdpRightsNotice,
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
      const discResult = analyzeCP523Discrepancies({
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
      const discResult = analyzeCP523Discrepancies({
        extraction: ext,
        userFacts: ctx.input.userFacts,
        userObjective: ctx.input.userObjective,
      });
      const evidenceResult = buildCP523EvidenceChecklist({
        extraction: ext,
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
      });
      const strategy = generateCP523Strategy({
        discrepancies: discResult.discrepancies,
        findings: discResult.findings,
        evidence: evidenceResult.items,
        userFacts: ctx.input.userFacts ?? null,
        userObjective: ctx.input.userObjective ?? null,
        hasDeadline: !!(ext.responseDeadline || ext.cdpHearingDeadline),
        extractionConfident: ext.classificationConfidence >= 0.7,
        cdpRightsNotice: ext.cdpRightsNotice,
      });

      // Build a minimal case for validateCP523Draft
      const draft = ctx.draft ?? "";

      // Use validateFactualConsistency + validateRequirementCompleteness
      const factualFindings = validateFactualConsistency(
        draft,
        ext,
        discResult.discrepancies,
        ctx.input.userFacts ?? null,
      );
      // Build a pseudo-case for requirement validation
      const requirementFindings = validateRequirementCompletenessFromCtx(
        draft,
        ext,
        discResult.discrepancies,
        evidenceResult.items,
        strategy,
        ext.responseDeadline || ext.cdpHearingDeadline,
      );

      const allFindings = [...factualFindings, ...requirementFindings];
      const errorCount = allFindings.filter(f => f.severity === "error" && !f.passed).length;
      const warningCount = allFindings.filter(f => f.severity === "warning" && !f.passed).length;
      const blockCount = allFindings.filter(f => f.severity === "block" && !f.passed).length;

      return {
        factualFindings: factualFindings.map(toValidationFinding),
        requirementFindings: requirementFindings.map(toValidationFinding),
        allFindings: allFindings.map(toValidationFinding),
        passed: errorCount === 0 && blockCount === 0,
        errors: errorCount,
        warnings: warningCount,
        blocks: blockCount,
        blocked: blockCount > 0,
      };
    },
  };
}

// ── Helper: validate requirement completeness from context ──
// (avoiding circular import with cp523-validation which needs CP523Case)

import type { Finding } from "../finding";

function validateRequirementCompletenessFromCtx(
  draftText: string,
  extraction: CP523Extraction,
  discrepancies: CP523Discrepancy[],
  evidence: CP523EvidenceItem[],
  strategy: { position: string; requestedActions: string[]; supportingSources: string[] },
  deadline: string | null,
): CP523ValidationFindingShape[] {
  const findings: CP523ValidationFindingShape[] = [];
  const draftLower = draftText.toLowerCase();

  // Required sections
  const requiredSections = [
    { section: "Re:", check: "re_line" },
    { section: "dear", check: "salutation" },
    { section: "sincerely", check: "closing" },
  ];
  for (const { section, check } of requiredSections) {
    const found = draftLower.includes(section.toLowerCase());
    findings.push({
      check: `required_section:${check}`,
      passed: found,
      detail: found ? `Required section "${section}" found` : `Required section "${section}" not found in draft`,
      severity: "error" as const,
      validator: "requirement" as const,
    });
  }

  // Discrepancy addressed
  for (const d of discrepancies) {
    if (d.type === "balance_dispute") {
      const irsAmount = d.irsAmount;
      const userAmount = d.userAmount;
      const mentionsDiscrepancy = (irsAmount && draftText.includes(irsAmount)) || (userAmount && draftText.includes(userAmount));
      findings.push({
        check: `discrepancy_addressed:${d.id}`,
        passed: mentionsDiscrepancy,
        detail: mentionsDiscrepancy
          ? `Discrepancy between ${irsAmount ?? "?"} and ${userAmount ?? "?"} appears to be addressed`
          : `Discrepancy between ${irsAmount ?? "?"} and ${userAmount ?? "?"} is not addressed in the draft`,
        severity: "warning" as const,
        validator: "requirement" as const,
      });
    }
  }

  // Evidence listed
  const requiredEvidence = evidence.filter(e => e.requirement === "required" && e.state === "provided");
  if (requiredEvidence.length > 0) {
    const draftHasEnclosure = draftLower.includes("enclosed") || draftLower.includes("attached") || draftLower.includes("include");
    findings.push({
      check: "evidence_listed",
      passed: draftHasEnclosure,
      detail: draftHasEnclosure
        ? "Draft references enclosed/attached documentation"
        : "Draft does not reference the enclosed documentation — add a list of enclosed evidence",
      severity: "block" as const,
      validator: "requirement" as const,
    });
  }

  // Deadline mentioned
  if (deadline) {
    const deadlineMentioned = draftText.includes(deadline) || draftLower.includes("deadline") || draftLower.includes("timely") || draftLower.includes("30 days");
    findings.push({
      check: "deadline_referenced",
      passed: deadlineMentioned,
      detail: deadlineMentioned
        ? "Draft references the response deadline or timeliness"
        : "Draft does not reference the response deadline — add a reference to the deadline",
      severity: "info" as const,
      validator: "requirement" as const,
    });
  }

  // Requested actions
  if (strategy) {
    const hasRequestedAction = draftLower.includes("request") || draftLower.includes("please") || draftLower.includes("ask") || draftLower.includes("reinstate");
    findings.push({
      check: "requested_actions_present",
      passed: hasRequestedAction,
      detail: hasRequestedAction ? "Draft contains a request or action item" : "Draft does not clearly state what action is being requested",
      severity: "warning" as const,
      validator: "requirement" as const,
    });
  }

  // Unresolved issues
  const unresolvedDiscrepancies = discrepancies.filter(d => d.status === "unresolved");
  if (unresolvedDiscrepancies.length > 0) {
    findings.push({
      check: "unresolved_issues",
      passed: false,
      detail: `${unresolvedDiscrepancies.length} unresolved discrepancy(ies) remain. These should be resolved or explicitly noted in the response.`,
      severity: "block" as const,
      validator: "requirement" as const,
    });
  }

  return findings;
}

type CP523ValidationFindingShape = {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
  validator: "factual" | "requirement";
};

// ── Register the pack on import ─────────────────────────────

registerExecutablePack(createCP523ExecutablePack());
