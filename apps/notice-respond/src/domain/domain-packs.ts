/* ═══════════════════════════════════════════════════════════
   DOMAIN PACKS — lightweight composable interfaces that
   specialize the shared workflow engine for a specific
   domain (CP2000, RFE, Debt Validation, Insurance Denial, etc.)

   A domain pack is NOT an implementation — it's a contract
   that describes WHAT the pack does, not HOW it does it.
   The actual implementation lives in the domain modules
   (cp2000.ts, cp14.ts, etc.).

   Packs compose into a complete workflow via the factory:
   
   WorkflowDefinition
       ↓
   DocumentPack → DeadlinePack → EvidencePack → ResearchPack
       ↓
   AnalysisPack → DraftPack → ValidationPack → SubmissionPack

   ═══════════════════════════════════════════════════════════ */

import type { CapabilityPack, WorkflowEngine } from "./workflow-definition";

// ── Document Pack ────────────────────────────────────────────

export interface DocumentPack {
  name: string;
  /** Document types this pack can classify */
  acceptedTypes: string[];
  /** Hints for the classifier (keywords, patterns, structure) */
  classifierHints: string[];
  /** Fields to extract from the document */
  extractionSchema: string[];
  /** Minimum classification confidence (0-1) */
  minConfidence: number;
}

// ── Deadline Pack ─────────────────────────────────────────────

export interface DeadlinePack {
  name: string;
  /** How deadlines are triggered */
  triggeringEvents: string[];
  /** Priority order for deadline sources */
  sourcePriority: string[];
  /** Whether jurisdiction affects deadlines */
  jurisdictionDependent: boolean;
  /** Rules for computing deadlines when not explicitly stated */
  computationRules: string[];
}

// ── Evidence Pack ──────────────────────────────────────────────

export interface EvidencePack {
  name: string;
  /** Types of evidence relevant to this domain */
  evidenceTypes: string[];
  /** What constitutes sufficient evidence */
  sufficiencyRules: string[];
  /** Rules for detecting contradictions in evidence */
  contradictionRules: string[];
  /** What happens when evidence is missing */
  missingEvidenceBehavior: string;
}

// ── Research Pack ──────────────────────────────────────────────

export interface ResearchPack {
  name: string;
  /** Authoritative source types for this domain */
  authoritativeSourceTypes: string[];
  /** Whether jurisdictional sources are required */
  jurisdictionalSourcesRequired: boolean;
  /** Citation requirements */
  citationRequirements: string[];
}

// ── Analysis Pack ──────────────────────────────────────────────

export interface AnalysisPack {
  name: string;
  /** Analysis capabilities from CapabilityPack[] */
  capabilities: CapabilityPack[];
  /** Ordered checks to perform during analysis */
  orderedChecks: string[];
  /** Risk factors specific to this domain */
  riskFactors: string[];
  /** Output sections the analysis produces */
  outputSections: string[];
}

// ── Draft Pack ─────────────────────────────────────────────────

export interface DraftPack {
  name: string;
  /** Type of document to draft */
  draftType: string;
  /** Required sections in the draft */
  requiredSections: string[];
  /** Claims that must not appear without supporting evidence */
  prohibitedUnsupportedClaims: string[];
  /** Tone and style rules */
  toneRules: string[];
}

// ── Validation Pack ────────────────────────────────────────────

export interface ValidationPack {
  name: string;
  /** Checks to verify factual accuracy of the draft */
  factualChecks: string[];
  /** Checks to verify all requirements are addressed */
  requirementChecks: string[];
  /** Checks to detect unsupported assertions */
  unsupportedAssertionChecks: string[];
  /** Adversarial checks (trying to break the draft) */
  adversarialChecks: string[];
}

// ── Submission Pack ───────────────────────────────────────────

export interface SubmissionPack {
  name: string;
  /** How the response can be submitted */
  methods: string[];
  /** Rules for determining the recipient */
  recipientRules: string[];
  /** Whether mailing is supported via MailMyPDF */
  supportsMailing: boolean;
  /** Whether tracking/proof is supported */
  supportsTracking: boolean;
  /** Proof requirements */
  proofRequirements: string[];
}

// ── Complete Domain Pack Set ───────────────────────────────────

export interface DomainPackSet {
  engine: WorkflowEngine;
  document: DocumentPack;
  deadline: DeadlinePack;
  evidence: EvidencePack;
  research: ResearchPack;
  analysis: AnalysisPack;
  draft: DraftPack;
  validation: ValidationPack;
  submission: SubmissionPack;
}

// ── Pack Registry ──────────────────────────────────────────────

export const PACK_REGISTRY: Record<string, DomainPackSet> = {};

export function registerDomainPack(workflowId: string, pack: DomainPackSet): void {
  PACK_REGISTRY[workflowId] = pack;
}

export function getDomainPack(workflowId: string): DomainPackSet | undefined {
  return PACK_REGISTRY[workflowId];
}
