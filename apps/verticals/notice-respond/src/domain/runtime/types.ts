/* ═══════════════════════════════════════════════════════════
   RUNTIME TYPES — core pipeline contracts.

   These types define the executable workflow runtime:
   - WorkflowContext: accumulated state across pipeline stages
   - StageResult: explicit result of each stage
   - ValidationResult: generic validation output (matches CP14/CP2000)
   - WorkflowPipelineResult: final pipeline output

   These types do NOT replace existing CP14/CP2000 types.
   They provide the generic contracts the pipeline executor uses.
   Domain packs bridge between their specific types and these.

   ═══════════════════════════════════════════════════════════ */

import type { NoticeFact } from "../fact";
import type { Finding } from "../finding";
import type { ContentClassification } from "../security";
import type { DraftProvenance } from "../draft-provenance";
import type { ResearchPack } from "../source-provenance";
import type { WorkflowEngine } from "../workflow-definition";

// ── Stage Status ─────────────────────────────────────────────

export type StageStatus =
  | "passed"       // stage executed successfully
  | "failed"       // stage executed but produced errors
  | "blocked"      // stage blocked by prior failure
  | "not_supported" // pack doesn't implement this capability
  | "skipped";     // intentionally skipped (e.g. engine policy)

export interface StageResult {
  stage: string;
  status: StageStatus;
  durationMs: number;
  error?: string;
  detail?: string;
}

// ── Base Extraction ──────────────────────────────────────────
// Minimal interface all extraction results must satisfy.
// Domain packs return their specific types; the pipeline
// works with this interface.

export interface BaseExtraction {
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  facts: NoticeFact[];
  warnings: string[];
  classificationConfidence: number;
}

// ── Generic Validation ──────────────────────────────────────
// Structurally identical to CP14ValidationResult / CP2000ValidationResult.

export interface ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
  validator: "factual" | "requirement";
}

export interface ValidationResult {
  factualFindings: ValidationFinding[];
  requirementFindings: ValidationFinding[];
  allFindings: ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
  blocked: boolean;
}

// ── Generic Discrepancy ──────────────────────────────────────
// Structurally identical to CP14Discrepancy / Discrepancy.

export interface Discrepancy {
  id: string;
  type: string;
  description: string;
  noticeValue: string | null;
  userValue: string | null;
  severity: "critical" | "high" | "medium" | "low";
  status: "unresolved" | "user_correct" | "irs_correct" | "unclear";
  explanation: string;
}

export interface DiscrepancyAnalysisResult {
  discrepancies: Discrepancy[];
  findings: Finding[];
}

// ── Generic Evidence Checklist ───────────────────────────────

export interface EvidenceChecklistItem {
  id: string;
  label: string;
  requirement: "required" | "recommended" | "optional" | "not_applicable";
  state: "not_provided" | "provided" | "waived" | "not_applicable";
  description: string;
  relatedDiscrepancyIds: string[];
}

export interface EvidenceChecklistResult {
  items: EvidenceChecklistItem[];
  satisfied: number;
  required: number;
  provided: number;
  missing: number;
  allRequiredSatisfied: boolean;
}

// ── Generic Strategy ─────────────────────────────────────────
// Structurally identical to CP14ResponseStrategy / CP2000ResponseStrategy.

export interface ResponseStrategy {
  position: string;
  rationale: string;
  recommendedActions: string[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
}

// ── Deadline ─────────────────────────────────────────────────

export interface DeadlineInfo {
  raw: string | null;
  parsed: string | null;
  certainty: "confirmed" | "derived" | "uncertain" | "missing";
  source: string;
}

// ── Audit Event ──────────────────────────────────────────────

export interface AuditEvent {
  stage: string;
  timestamp: string;
  message: string;
  data?: unknown;
}

// ── Workflow Input ───────────────────────────────────────────

export interface WorkflowInput {
  rawText: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  userFacts?: string;
  userObjective?: string;
}

// ── Workflow Context ────────────────────────────────────────
// Accumulated state across all pipeline stages.
// Strongly typed — no Record<string, any>.

export interface WorkflowContext {
  // Identity
  workflowId: string;
  engine: WorkflowEngine;

  // Input
  input: WorkflowInput;

  // Stage results (each stage writes here)
  security?: ContentClassification;
  extraction?: BaseExtraction;
  facts: NoticeFact[];
  deadline?: DeadlineInfo;
  discrepancies: Discrepancy[];
  findings: Finding[];
  evidence: EvidenceChecklistItem[];
  research?: ResearchPack;
  strategy?: ResponseStrategy;
  draft?: string;
  draftProvenance?: DraftProvenance;
  factualValidation?: ValidationResult;
  requirementValidation?: ValidationResult;

  // Blocking state
  blocked: boolean;
  blockReasons: string[];

  // Audit trail
  stageResults: StageResult[];
  auditEvents: AuditEvent[];
}

// ── Pipeline Result ──────────────────────────────────────────

export interface WorkflowPipelineResult {
  context: WorkflowContext;
  stages: StageResult[];
  ready: boolean;
  errors: string[];
  warnings: string[];
}

// ── Factory create context ───────────────────────────────────

export function createWorkflowContext(
  workflowId: string,
  engine: WorkflowEngine,
  input: WorkflowInput,
): WorkflowContext {
  return {
    workflowId,
    engine,
    input,
    facts: [],
    discrepancies: [],
    findings: [],
    evidence: [],
    blocked: false,
    blockReasons: [],
    stageResults: [],
    auditEvents: [],
  };
}

// ── Helper: record a stage result ────────────────────────────

export function recordStage(
  ctx: WorkflowContext,
  stage: string,
  status: StageStatus,
  durationMs: number,
  detail?: string,
  error?: string,
): void {
  ctx.stageResults.push({ stage, status, durationMs, detail, error });
  ctx.auditEvents.push({
    stage,
    timestamp: new Date().toISOString(),
    message: `${stage}: ${status}${error ? ` — ${error}` : ""}`,
  });
}

// ── Consequential Pipeline State ─────────────────────────────
// Post-intelligence gates: review → approval → payment → mailing → tracking → proof

export interface ConsequentialState {
  draftValidationPassed: boolean;
  reviewChecks: boolean[];
  approved: boolean;
  paymentComplete: boolean;
  mailingReady: boolean;
  mailingSubmitted: boolean;
  trackingNumber: string | null;
  proofVerified: boolean;
}

export function createConsequentialState(overrides?: Partial<ConsequentialState>): ConsequentialState {
  return {
    draftValidationPassed: false,
    reviewChecks: [],
    approved: false,
    paymentComplete: false,
    mailingReady: false,
    mailingSubmitted: false,
    trackingNumber: null,
    proofVerified: false,
    ...overrides,
  };
}

export function isConsequentialComplete(state: ConsequentialState): boolean {
  return (
    state.draftValidationPassed &&
    state.reviewChecks.length > 0 &&
    state.reviewChecks.every(Boolean) &&
    state.approved &&
    state.paymentComplete &&
    state.mailingReady &&
    state.mailingSubmitted &&
    state.trackingNumber !== null &&
    state.proofVerified
  );
}
