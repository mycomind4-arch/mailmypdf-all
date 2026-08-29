/* ═══════════════════════════════════════════════════════════
   EXECUTABLE DOMAIN PACK — extends the declarative DomainPackSet
   with executable functions.

   A pack declares:
   - capabilities: which stages it supports
   - functions: implementations for supported stages
   - config: the existing declarative DomainPackSet (backward compat)

   Unsupported capabilities produce NOT_SUPPORTED — never silent success.

   ═══════════════════════════════════════════════════════════ */

import type { DomainPackSet } from "../domain-packs";
import type { WorkflowEngine } from "../workflow-definition";
import type {
  BaseExtraction,
  WorkflowContext,
  DiscrepancyAnalysisResult,
  EvidenceChecklistResult,
  ValidationResult,
  ResponseStrategy,
} from "./types";
import type { ResearchPack } from "../source-provenance";

// ── Capability flags ────────────────────────────────────────

export interface PackCapabilities {
  /** Always required */
  security: true;
  /** Always required */
  extraction: true;
  /** Always required */
  classification: true;
  /** Optional */
  deadline: boolean;
  /** Optional */
  discrepancy: boolean;
  /** Optional */
  evidence: boolean;
  /** Optional */
  research: boolean;
  /** Optional */
  strategy: boolean;
  /** Always required */
  draft: true;
  /** Optional — two-pass validation */
  factualValidation: boolean;
  /** Optional — two-pass validation */
  requirementValidation: boolean;
}

// ── Executable Domain Pack ──────────────────────────────────

export interface ExecutableDomainPack {
  /** Workflow ID this pack serves */
  workflowId: string;
  /** Engine this pack runs on */
  engine: WorkflowEngine;

  /** Declarative configuration (backward compatible with DomainPackSet) */
  config: DomainPackSet;

  /** Capability declaration — what this pack supports */
  capabilities: PackCapabilities;

  // ── Required functions ──────────────────────────────

  /** Extract structured data from raw document text */
  extract: (text: string) => BaseExtraction;

  /** Generate the response draft */
  generateDraft: (ctx: WorkflowContext) => string;

  // ── Optional functions (required iff capability is true) ──

  /** Analyze discrepancies between notice and user data */
  analyzeDiscrepancies?: (ctx: WorkflowContext) => DiscrepancyAnalysisResult;

  /** Build evidence checklist */
  buildEvidenceChecklist?: (ctx: WorkflowContext) => EvidenceChecklistResult;

  /** Get research pack with authoritative sources */
  getResearchPack?: () => ResearchPack;

  /** Generate response strategy */
  generateStrategy?: (ctx: WorkflowContext) => ResponseStrategy;

  /** Validate factual consistency */
  validateFactual?: (ctx: WorkflowContext) => ValidationResult;

  /** Validate requirement completeness */
  validateRequirements?: (ctx: WorkflowContext) => ValidationResult;
}

// ── Validation ──────────────────────────────────────────────

export function validateExecutablePack(pack: ExecutableDomainPack): string[] {
  const errors: string[] = [];

  if (!pack.workflowId) errors.push("Missing workflowId");
  if (!pack.engine) errors.push("Missing engine");
  if (!pack.config) errors.push("Missing declarative config (DomainPackSet)");
  if (!pack.capabilities) errors.push("Missing capabilities");

  // Required functions
  if (typeof pack.extract !== "function") errors.push("Missing required function: extract");
  if (typeof pack.generateDraft !== "function") errors.push("Missing required function: generateDraft");

  // Capability-function consistency
  if (pack.capabilities?.discrepancy && typeof pack.analyzeDiscrepancies !== "function") {
    errors.push("Capability discrepancy=true but analyzeDiscrepancies not implemented");
  }
  if (pack.capabilities?.evidence && typeof pack.buildEvidenceChecklist !== "function") {
    errors.push("Capability evidence=true but buildEvidenceChecklist not implemented");
  }
  if (pack.capabilities?.research && typeof pack.getResearchPack !== "function") {
    errors.push("Capability research=true but getResearchPack not implemented");
  }
  if (pack.capabilities?.strategy && typeof pack.generateStrategy !== "function") {
    errors.push("Capability strategy=true but generateStrategy not implemented");
  }
  if (pack.capabilities?.factualValidation && typeof pack.validateFactual !== "function") {
    errors.push("Capability factualValidation=true but validateFactual not implemented");
  }
  if (pack.capabilities?.requirementValidation && typeof pack.validateRequirements !== "function") {
    errors.push("Capability requirementValidation=true but validateRequirements not implemented");
  }

  return errors;
}
