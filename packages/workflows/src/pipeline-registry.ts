/**
 * Canonical MailMyPDF pipeline archetypes.
 *
 * A workflow selects one primary archetype and may compose specialist modules.
 * These are execution shapes, not duplicate workflow implementations.
 */
export type PipelineId =
  | "P01_CORE_MAIL"
  | "P02_OFFICIAL_RESPONSE"
  | "P03_APPEAL"
  | "P04_COURT"
  | "P05_IMMIGRATION"
  | "P06_DISPUTE"
  | "P07_BUSINESS_AUTOMATION"
  | "P08_RECORDS"
  | "P09_REGULATORY"
  | "P10_CLAIM_PROOF";

export type PipelineFamily = {
  id: PipelineId;
  name: string;
  description: string;
  requiredStages: readonly string[];
  optionalStages: readonly string[];
  bestFor: readonly string[];
};

const ALL = [
  "security",
  "classification",
  "extraction",
  "provenance",
  "deadline",
  "contradiction",
  "findings",
  "discrepancy",
  "evidence",
  "research",
  "risk",
  "strategy",
  "draft",
  "draftProvenance",
  "validation",
  "blockingGate",
  "review",
  "approval",
  "mailing",
  "tracking",
  "proofAudit",
] as const;

export const PIPELINES: Readonly<Record<PipelineId, PipelineFamily>> = {
  P01_CORE_MAIL: {
    id: "P01_CORE_MAIL",
    name: "Core Mail / Correspondence",
    description: "Simple document or letter preparation and physical mailing with validation, review, tracking, and proof.",
    requiredStages: ["security", "extraction", "provenance", "draft", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["classification", "deadline", "evidence", "risk"],
    bestFor: ["Mail a PDF", "write a letter", "templates", "routine correspondence"],
  },
  P02_OFFICIAL_RESPONSE: {
    id: "P02_OFFICIAL_RESPONSE",
    name: "Notice / Official Response",
    description: "Source-document-first response pipeline for official notices, agency requests, and formal correspondence.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "requirements", "evidence", "strategy", "draft", "draftProvenance", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["contradiction", "discrepancy", "research", "risk", "approval"],
    bestFor: ["IRS notices", "government notices", "agency actions", "formal requests"],
  },
  P03_APPEAL: {
    id: "P03_APPEAL",
    name: "Appeal / Reconsideration",
    description: "Adverse-decision pipeline emphasizing grounds, evidence, contradictions, deadlines, risk, strategy, stress testing, and readiness.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "discrepancy", "evidence", "risk", "strategy", "draft", "draftProvenance", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["contradiction", "research", "approval"],
    bestFor: ["denials", "appeals", "reconsideration", "benefits appeals", "insurance appeals"],
  },
  P04_COURT: {
    id: "P04_COURT",
    name: "Court / Formal Proceeding",
    description: "Procedure-sensitive pipeline for court papers, summonses, filing instructions, and formal procedural responses.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "requirements", "evidence", "research", "risk", "strategy", "draft", "validation", "blockingGate", "review", "approval", "mailing", "tracking", "proofAudit"],
    optionalStages: ["contradiction", "discrepancy"],
    bestFor: ["summonses", "court notices", "formal procedural responses"],
  },
  P05_IMMIGRATION: {
    id: "P05_IMMIGRATION",
    name: "Immigration Evidence / Response",
    description: "Immigration-specific notice, evidence, explanation, and submission pipeline with strict source and document grounding.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "requirements", "evidence", "risk", "strategy", "draft", "draftProvenance", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["research", "contradiction", "discrepancy", "approval"],
    bestFor: ["immigration notices", "supporting documents", "explanation letters"],
  },
  P06_DISPUTE: {
    id: "P06_DISPUTE",
    name: "Dispute / Investigation",
    description: "Evidence-heavy dispute pipeline emphasizing factual normalization, contradictions, chronology, substantiation, and measured escalation.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "contradiction", "discrepancy", "evidence", "risk", "strategy", "draft", "draftProvenance", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["findings", "research", "approval"],
    bestFor: ["debt", "credit", "billing", "collections", "consumer disputes"],
  },
  P07_BUSINESS_AUTOMATION: {
    id: "P07_BUSINESS_AUTOMATION",
    name: "Business Automation",
    description: "Trigger-driven correspondence pipeline with risk classification, approval policies, scheduled actions, and auditability.",
    requiredStages: ["security", "provenance", "risk", "draft", "draftProvenance", "validation", "blockingGate", "mailing", "tracking", "proofAudit"],
    optionalStages: ["classification", "extraction", "deadline", "evidence", "research", "review", "approval"],
    bestFor: ["payment reminders", "demands", "renewals", "compliance notices", "business disputes"],
  },
  P08_RECORDS: {
    id: "P08_RECORDS",
    name: "Records / Information Request",
    description: "Request-scoping pipeline centered on authority, recipient rules, records sought, deadlines, and fulfillment proof.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "requirements", "evidence", "research", "strategy", "draft", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["contradiction", "discrepancy", "risk", "approval"],
    bestFor: ["records requests", "public information requests", "agency document requests"],
  },
  P09_REGULATORY: {
    id: "P09_REGULATORY",
    name: "Regulatory / Permit / Rights Response",
    description: "Rule- and requirement-sensitive response pipeline for licensing, permits, compliance, and housing/regulatory correspondence.",
    requiredStages: ["security", "classification", "extraction", "provenance", "deadline", "findings", "requirements", "evidence", "research", "risk", "strategy", "draft", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["contradiction", "discrepancy", "approval"],
    bestFor: ["permits", "licensing", "regulatory responses", "tenant replies"],
  },
  P10_CLAIM_PROOF: {
    id: "P10_CLAIM_PROOF",
    name: "Claim / Proof / Evidence Package",
    description: "Evidence- and provenance-first package pipeline where a defensible record and proof chain are central outputs.",
    requiredStages: ["security", "classification", "extraction", "provenance", "timeline", "evidence", "risk", "strategy", "draft", "draftProvenance", "validation", "blockingGate", "review", "mailing", "tracking", "proofAudit"],
    optionalStages: ["deadline", "contradiction", "discrepancy", "research", "approval"],
    bestFor: ["claim proof", "evidence packages", "benefits documentation", "supporting submissions"],
  },
};

export function getPipeline(id: PipelineId): PipelineFamily {
  const pipeline = PIPELINES[id];
  if (!pipeline) throw new Error(`Unknown pipeline: ${id}`);
  return pipeline;
}

export function isPipelineId(value: string): value is PipelineId {
  return Object.prototype.hasOwnProperty.call(PIPELINES, value);
}

export const pipelineIds = Object.keys(PIPELINES) as PipelineId[];
export const goldStandardStageUniverse = ALL;
