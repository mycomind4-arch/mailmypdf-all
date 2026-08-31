/* ═══════════════════════════════════════════════════════════
   WORKFLOW CAPABILITIES — capability packs and factory system
   for Benefits Appeal, adapted from the Notice Respond gold-standard
   architecture.

   This module provides:
   - CapabilityPack definitions (what a workflow can do)
   - DomainPack interfaces (how a workflow specializes the engine)
   - Factory construction (validate → resolve → load → construct)
   - Quality gate evaluation

   The existing workflows.ts definitions remain the source of truth
   for workflow IDs and step labels. This layer adds the capability
   architecture on top.

   ═══════════════════════════════════════════════════════════ */

import type { WorkflowId, WorkflowDefinition } from "./workflows";

// ── Capability Packs ──────────────────────────────────────────

export type CapabilityPack =
  | "document-classification"
  | "fact-extraction"
  | "deadline-analysis"
  | "evidence-analysis"
  | "contradiction-analysis"
  | "xray-analysis"
  | "timeline-analysis"
  | "stress-testing"
  | "response-strategy"
  | "drafting"
  | "draft-validation"
  | "readiness-review"
  | "submission"
  | "mailing"
  | "proof";

export const ALL_CAPABILITIES: readonly CapabilityPack[] = [
  "document-classification",
  "fact-extraction",
  "deadline-analysis",
  "evidence-analysis",
  "contradiction-analysis",
  "xray-analysis",
  "timeline-analysis",
  "stress-testing",
  "response-strategy",
  "drafting",
  "draft-validation",
  "readiness-review",
  "submission",
  "mailing",
  "proof",
] as const;

export type WorkflowLifecycle = "blueprint" | "functional" | "authority";

export interface DocumentPack {
  name: string;
  acceptedTypes: string[];
  classifierHints: string[];
  extractionSchema: string[];
  minConfidence: number;
}

export interface DeadlinePack {
  name: string;
  triggeringEvents: string[];
  sourcePriority: string[];
  jurisdictionDependent: boolean;
  computationRules: string[];
}

export interface EvidencePack {
  name: string;
  evidenceTypes: string[];
  sufficiencyRules: string[];
  contradictionRules: string[];
  missingEvidenceBehavior: string;
}

export interface AnalysisPack {
  name: string;
  capabilities: CapabilityPack[];
  orderedChecks: string[];
  riskFactors: string[];
  outputSections: string[];
}

export interface DraftPack {
  name: string;
  draftType: string;
  requiredSections: string[];
  prohibitedUnsupportedClaims: string[];
  toneRules: string[];
}

export interface ValidationPack {
  name: string;
  factualChecks: string[];
  requirementChecks: string[];
  unsupportedAssertionChecks: string[];
  adversarialChecks: string[];
}

export interface SubmissionPack {
  name: string;
  methods: string[];
  recipientRules: string[];
  supportsMailing: boolean;
  supportsTracking: boolean;
  proofRequirements: string[];
}

export interface DomainPackSet {
  engine: "appeal";
  document: DocumentPack;
  deadline: DeadlinePack;
  evidence: EvidencePack;
  analysis: AnalysisPack;
  draft: DraftPack;
  validation: ValidationPack;
  submission: SubmissionPack;
}

const PACK_REGISTRY: Record<string, DomainPackSet> = {};

export function registerDomainPack(workflowId: string, pack: DomainPackSet): void {
  PACK_REGISTRY[workflowId] = pack;
}

export function getDomainPack(workflowId: string): DomainPackSet | undefined {
  return PACK_REGISTRY[workflowId];
}

export function getRegisteredWorkflowIds(): string[] {
  return Object.keys(PACK_REGISTRY);
}

export interface QualityGate {
  documentRecognition: boolean;
  factGrounding: boolean;
  deadlineVerification: boolean;
  evidenceGrounding: boolean;
  draftValidation: boolean;
  submissionReadiness: boolean;
  proofReady: boolean;
}

export interface ConstructedWorkflow {
  definition: WorkflowDefinition;
  capabilities: CapabilityPack[];
  packs: DomainPackSet | undefined;
  qualityGate: QualityGate;
  lifecycle: WorkflowLifecycle;
  warnings: string[];
  errors: string[];
  ready: boolean;
}

export function validateDefinition(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  if (!def.id) errors.push("Missing workflow id");
  if (!def.title) errors.push("Missing title");
  if (!def.description) errors.push("Missing description");
  if (!def.steps?.length) errors.push("No workflow steps");
  if (!def.stepLabels?.length) errors.push("No step labels");
  if (def.steps.length !== def.stepLabels.length) errors.push("Steps and labels count mismatch");
  if (!def.decisionFields?.length) errors.push("No decision field definitions");
  if (!def.focusAreas?.length) errors.push("No focus areas");
  return errors;
}

export function loadCapabilities(def: WorkflowDefinition, packs?: DomainPackSet): CapabilityPack[] {
  const caps = new Set<CapabilityPack>();

  // These capabilities are only executable when their concrete packs exist.
  if (packs?.document) {
    caps.add("document-classification");
    caps.add("fact-extraction");
  }
  if (packs?.deadline) caps.add("deadline-analysis");
  if (packs?.evidence) caps.add("evidence-analysis");
  if (packs?.analysis?.capabilities) {
    for (const cap of packs.analysis.capabilities) caps.add(cap);
  }
  if (packs?.draft) caps.add("drafting");
  if (packs?.validation) caps.add("draft-validation");
  if (packs?.validation) caps.add("readiness-review");
  if (packs?.submission) {
    caps.add("submission");
    if (packs.submission.supportsMailing) caps.add("mailing");
    if (packs.submission.supportsTracking) caps.add("proof");
  }

  // Pipeline steps are evidence of intended behavior, not implementation.
  // They must never manufacture executable capability by themselves.
  if (def.steps.includes("xray") && packs?.analysis?.capabilities.includes("xray-analysis")) caps.add("xray-analysis");
  if (def.steps.includes("timeline") && packs?.analysis?.capabilities.includes("timeline-analysis")) caps.add("timeline-analysis");
  if ((def.steps.includes("stress-test") || def.steps.includes("final-stress-test")) && packs?.analysis?.capabilities.includes("stress-testing")) caps.add("stress-testing");

  return Array.from(caps);
}

export function evaluateQualityGate(
  def: WorkflowDefinition,
  packs?: DomainPackSet,
): QualityGate {
  const hasDoc = !!packs?.document;
  const hasEvidence = !!packs?.evidence;
  const hasDraft = !!packs?.draft;
  const hasValidation = !!packs?.validation;
  const hasSubmission = !!packs?.submission;

  return {
    documentRecognition: hasDoc,
    factGrounding: hasDoc,
    deadlineVerification: hasDoc && !!packs?.deadline,
    evidenceGrounding: hasEvidence,
    draftValidation: hasValidation,
    submissionReadiness: hasSubmission && hasDraft && packs?.submission.supportsMailing === true,
    proofReady: hasSubmission && packs?.submission.supportsTracking === true && packs.submission.proofRequirements.length > 0,
  };
}

export function determineLifecycle(gate: QualityGate): WorkflowLifecycle {
  const allPassed = Object.values(gate).every(Boolean);
  if (allPassed) return "authority";
  const somePassed = Object.values(gate).some(Boolean);
  if (somePassed) return "functional";
  return "blueprint";
}

export function constructWorkflow(def: WorkflowDefinition): ConstructedWorkflow {
  const warnings: string[] = [];
  const errors: string[] = [];

  const validationErrors = validateDefinition(def);
  errors.push(...validationErrors);

  const packs = getDomainPack(def.id);
  if (!packs) {
    warnings.push(`No domain pack set registered for ${def.id} — no executable capabilities are granted`);
  }

  const capabilities = loadCapabilities(def, packs);
  const qualityGate = evaluateQualityGate(def, packs);
  const lifecycle = determineLifecycle(qualityGate);

  if (lifecycle === "blueprint") {
    warnings.push(`Workflow ${def.id} has no executable domain packs — quality gate is all false`);
  }

  return {
    definition: def,
    capabilities,
    packs,
    qualityGate,
    lifecycle,
    warnings,
    errors,
    ready: errors.length === 0,
  };
}

export function constructAllWorkflows(
  definitions: Record<WorkflowId, WorkflowDefinition>,
): ConstructedWorkflow[] {
  return Object.values(definitions).map(constructWorkflow);
}

export function factoryValidationSummary(workflows: ConstructedWorkflow[]): {
  total: number;
  ready: number;
  withErrors: number;
  withWarnings: number;
  authorityCount: number;
  functionalCount: number;
  blueprintCount: number;
  errors: { workflowId: string; errors: string[] }[];
  warnings: { workflowId: string; warnings: string[] }[];
} {
  return {
    total: workflows.length,
    ready: workflows.filter((w) => w.ready).length,
    withErrors: workflows.filter((w) => w.errors.length > 0).length,
    withWarnings: workflows.filter((w) => w.warnings.length > 0).length,
    authorityCount: workflows.filter((w) => w.lifecycle === "authority").length,
    functionalCount: workflows.filter((w) => w.lifecycle === "functional").length,
    blueprintCount: workflows.filter((w) => w.lifecycle === "blueprint").length,
    errors: workflows.filter((w) => w.errors.length > 0).map((w) => ({ workflowId: w.definition.id, errors: w.errors })),
    warnings: workflows.filter((w) => w.warnings.length > 0).map((w) => ({ workflowId: w.definition.id, warnings: w.warnings })),
  };
}
