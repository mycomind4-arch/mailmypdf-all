import type { DomainPackManifest } from "../../domain-pack-contract.js";
import type { AppealDraftValidationPolicy } from "../../draft-validator.js";

/**
 * Reusable insurance-appeal configuration promoted from the legacy Appeal Mail
 * domain layer. This file configures the shared workflow engine; it does not
 * implement or duplicate the engine itself.
 */
export interface AppealDocumentPackConfig {
  name: string;
  acceptedTypes: readonly string[];
  classifierHints: readonly string[];
  extractionSchema: readonly string[];
  minConfidence: number;
}

export interface AppealDeadlinePackConfig {
  name: string;
  triggeringEvents: readonly string[];
  sourcePriority: readonly string[];
  jurisdictionDependent: boolean;
  computationRules: readonly string[];
}

export interface AppealEvidencePackConfig {
  name: string;
  evidenceTypes: readonly string[];
  sufficiencyRules: readonly string[];
  contradictionRules: readonly string[];
  missingEvidenceBehavior: string;
}

export interface AppealAnalysisPackConfig {
  name: string;
  orderedChecks: readonly string[];
  riskFactors: readonly string[];
  outputSections: readonly string[];
}

export interface AppealDraftPackConfig {
  name: string;
  draftType: string;
  requiredSections: readonly string[];
  prohibitedUnsupportedClaims: readonly string[];
  toneRules: readonly string[];
}

export interface AppealValidationPackConfig extends AppealDraftValidationPolicy {
  name: string;
  factualChecks: readonly string[];
  requirementChecks: readonly string[];
  unsupportedAssertionChecks: readonly string[];
  adversarialChecks: readonly string[];
}

export interface AppealSubmissionPackConfig {
  name: string;
  methods: readonly string[];
  recipientRules: readonly string[];
  supportsMailing: boolean;
  supportsTracking: boolean;
  proofRequirements: readonly string[];
}

export interface InsuranceAppealPackSet {
  engine: "appeal";
  document: AppealDocumentPackConfig;
  deadline: AppealDeadlinePackConfig;
  evidence: AppealEvidencePackConfig;
  analysis: AppealAnalysisPackConfig;
  draft: AppealDraftPackConfig;
  validation: AppealValidationPackConfig;
  submission: AppealSubmissionPackConfig;
}

export const insuranceDocumentPack: AppealDocumentPackConfig = {
  name: "Insurance Denial Document Pack",
  acceptedTypes: [
    "denial letter",
    "explanation of benefits",
    "coverage decision",
    "claim determination",
    "benefit denial",
    "workers compensation denial",
  ],
  classifierHints: [
    "denied",
    "denial",
    "disapproved",
    "not covered",
    "not medically necessary",
    "exclusion",
    "policy provision",
    "claim number",
    "appeal rights",
    "explanation of benefits",
    "EOB",
    "coverage decision",
  ],
  extractionSchema: [
    "insurerName",
    "claimNumber",
    "policyNumber",
    "denialDate",
    "denialReasons",
    "citedPolicyProvisions",
    "claimType",
    "amountInDispute",
    "appealDeadline",
    "appealInstructions",
    "requestedService",
    "diagnosisCode",
    "procedureCode",
  ],
  minConfidence: 0.7,
};

export const insuranceDeadlinePack: AppealDeadlinePackConfig = {
  name: "Insurance Appeal Deadline Pack",
  triggeringEvents: [
    "explicit deadline in denial letter",
    "state-mandated appeal window (varies by jurisdiction)",
    "policy-specified appeal timeline",
  ],
  sourcePriority: [
    "uploaded denial letter (explicit deadline)",
    "policy document (appeal timeline)",
    "state regulation (default window)",
    "user verification",
  ],
  jurisdictionDependent: true,
  computationRules: [
    "Do NOT infer a deadline if the denial letter does not explicitly state one",
    "If the letter says 'appeal within N days', compute from the denial date with derived certainty",
    "If the letter says 'appeal by [date]', use that date with confirmed certainty",
    "If no deadline is found, mark as MISSING — never fabricate",
    "State-specific deadlines should be noted but not stated as fact without a source",
  ],
};

export const insuranceEvidencePack: AppealEvidencePackConfig = {
  name: "Insurance Appeal Evidence Pack",
  evidenceTypes: [
    "denial letter",
    "insurance policy / plan documents",
    "explanation of benefits (EOB)",
    "medical records",
    "doctor's letter / letter of medical necessity",
    "billing statements",
    "claim correspondence",
    "photos / damage reports",
    "receipts / invoices",
    "prior authorization documents",
    "appeal forms",
    "expert opinions",
  ],
  sufficiencyRules: [
    "Each denied claim item must have corresponding supporting documentation",
    "Medical necessity disputes require clinical documentation",
    "Policy provision disputes require the cited policy page/section",
    "Procedural errors require showing what step was violated",
  ],
  contradictionRules: [
    "Compare insurer's stated reason vs policy language actually cited",
    "Compare denial date vs claim filing date vs policy effective dates",
    "Check if denied service matches policy exclusion language",
    "Check if medical necessity denial has contradictory clinical records",
    "Verify claim amounts across documents",
  ],
  missingEvidenceBehavior: "Warn the user and mark an evidence gap. Never fabricate missing evidence; identify exactly what is needed.",
};

export const insuranceAnalysisPack: AppealAnalysisPackConfig = {
  name: "Insurance Denial Analysis Pack",
  orderedChecks: [
    "classify document as insurance denial",
    "extract structured fields (insurer, claim #, policy #, denial date)",
    "identify denial reasons",
    "extract cited policy provisions",
    "identify response deadline",
    "extract amounts in dispute",
    "detect policy language mismatches",
    "detect contradictory evidence",
    "detect unaddressed evidence",
    "detect procedural errors",
    "generate structured findings",
    "build evidence checklist",
    "assess ground strength",
    "generate response strategy",
  ],
  riskFactors: [
    "deadline approaching or missing",
    "no policy document uploaded",
    "denial reason unclear or insufficiently explained",
    "large amount in dispute",
    "medical necessity dispute without clinical evidence",
    "procedural error claim without documentation of the procedure",
    "low extraction confidence",
  ],
  outputSections: [
    "denial summary",
    "extracted facts",
    "denial reasons analysis",
    "policy provision analysis",
    "contradiction findings",
    "evidence checklist",
    "ground strength assessment",
    "recommended strategy",
  ],
};

export const insuranceDraftPack: AppealDraftPackConfig = {
  name: "Insurance Appeal Letter Draft Pack",
  draftType: "insurance appeal letter",
  requiredSections: ["Dear", "Sincerely", "Re:", "appeal"],
  prohibitedUnsupportedClaims: [
    "coverage conclusions without policy citation",
    "medical necessity assertions without clinical evidence",
    "legal authority citations without source",
    "guaranteed outcomes",
    "amounts not traceable to extracted facts or user records",
    "policy language not quoted from the actual policy document",
  ],
  toneRules: [
    "factual — state what the records show",
    "respectful — address the insurer professionally",
    "specific — reference each denial reason by number and wording",
    "evidence-backed — cite exhibits for each claim",
    "honest — acknowledge what is not known",
  ],
};

export const insuranceValidationPack: AppealValidationPackConfig = {
  name: "Insurance Appeal Two-Pass Validation Pack",
  requiredSections: insuranceDraftPack.requiredSections,
  prohibitedUnsupportedClaims: insuranceDraftPack.prohibitedUnsupportedClaims,
  factualChecks: [
    "every amount in draft matches extraction or user facts",
    "claim number present and consistent",
    "policy number present and consistent",
    "denial date present and consistent",
    "deadline present and consistent",
    "insurer name present and correct",
    "no fabricated amounts",
    "no unresolved placeholders",
    "no forbidden claims",
  ],
  requirementChecks: [
    "required letter sections present",
    "each identified denial reason addressed",
    "enclosed or attached documentation referenced",
    "deadline or timeliness referenced",
    "requested action clearly stated",
    "unresolved issues noted",
  ],
  unsupportedAssertionChecks: [
    "no dollar amounts not traceable to facts",
    "no policy citations not from the actual policy document",
    "no medical necessity claims without clinical evidence",
    "no procedural error claims without showing what was violated",
  ],
  adversarialChecks: [
    "draft with no denial reasons — should still be valid",
    "draft with wrong claim number — should flag",
    "draft with fabricated amount — should flag",
    "draft with placeholder — should flag",
    "draft with policy quote not in evidence — should flag",
    "empty draft — should fail",
  ],
};

export const insuranceSubmissionPack: AppealSubmissionPackConfig = {
  name: "MailMyPDF Submission Pack",
  methods: ["certified mail", "registered mail", "first-class mail with tracking"],
  recipientRules: [
    "Use the appeal address from the denial letter",
    "Verify the address matches the insurer's appeals department",
    "Include the claim number on the envelope",
  ],
  supportsMailing: true,
  supportsTracking: true,
  proofRequirements: ["mailing record (postage receipt)", "tracking number", "delivery confirmation"],
};

export const insuranceAppealPackSet: InsuranceAppealPackSet = {
  engine: "appeal",
  document: insuranceDocumentPack,
  deadline: insuranceDeadlinePack,
  evidence: insuranceEvidencePack,
  analysis: insuranceAnalysisPack,
  draft: insuranceDraftPack,
  validation: insuranceValidationPack,
  submission: insuranceSubmissionPack,
};

/**
 * Declares what a fully executable insurance appeal domain pack is expected to
 * provide to the canonical workflow engine. Configuration alone does not make
 * these capabilities executable; the engine still diagnoses actual handlers.
 */
export const insuranceAppealManifest: DomainPackManifest = {
  id: "appeal.insurance-denial",
  displayName: "Insurance Denial Appeal",
  capabilities: [
    "classification",
    "extraction",
    "understand",
    "facts",
    "provenance",
    "timeline",
    "deadlines",
    "requirements",
    "findings",
    "contradictions",
    "discrepancies",
    "evidence",
    "research",
    "risk",
    "strategy",
    "draft",
    "validation",
    "humanReview",
    "approval",
    "mailing",
    "tracking",
    "proofAudit",
  ],
};

// Compatibility alias for legacy callers migrating to the new architecture.
export const insurancePackSet = insuranceAppealPackSet;
