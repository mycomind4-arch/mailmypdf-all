/* ═══════════════════════════════════════════════════════════
   WORKFLOW DEFINITION — canonical model for every workflow
   in the MailMyPDF ecosystem.

   ONE shared definition system + specialized engines + domain
   packs = hundreds of workflows without rebuilding the app.

   ═══════════════════════════════════════════════════════════ */

// ── Lifecycle / Maturity ──────────────────────────────────────

export type WorkflowLifecycle = "blueprint" | "functional" | "authority";

// ── Engine Types ──────────────────────────────────────────────

/**
 * ENGINE A — DOCUMENT → ACTION
 * document → classify → extract → understand → deadline → requirements → action
 * Used by: CP2000, CP14, I-797, I-797C, USCIS RFE, government notices, insurance denials, summons
 */
export type WorkflowEngine =
  | "document-action"
  | "dispute"
  | "records"
  | "appeal"
  | "jurisdictional";

// ── Capability Packs ──────────────────────────────────────────

export type CapabilityPack =
  | "document-classification"
  | "fact-extraction"
  | "deadline-analysis"
  | "requirements-analysis"
  | "evidence-analysis"
  | "contradiction-analysis"
  | "research"
  | "response-strategy"
  | "drafting"
  | "draft-validation"
  | "submission"
  | "mailing"
  | "proof";

// ── Search Intent ─────────────────────────────────────────────

export interface SearchIntentDefinition {
  primary: string;
  secondary: string[];
  canonicalPath: string;
  informationalEntryPoints: string[];
  actionIntents: string[];
}

// ── Documents ─────────────────────────────────────────────────

export interface DocumentDefinition {
  name: string;
  identifiers: string[];
  acceptedFormats: string[];
  extractionFields: string[];
}

// ── Deadlines ─────────────────────────────────────────────────

export interface DeadlineDefinition {
  id: string;
  label: string;
  trigger: string;
  sourcePriority: string[];
  notes?: string[];
}

// ── Requirements ──────────────────────────────────────────────

export interface RequirementDefinition {
  id: string;
  label: string;
  type: "response" | "document" | "format" | "recipient" | "fee" | "other";
  source: string;
  required: boolean;
}

// ── Evidence ──────────────────────────────────────────────────

export interface EvidenceDefinition {
  id: string;
  label: string;
  purpose: string;
  required: boolean;
  examples: string[];
}

// ── Analysis ──────────────────────────────────────────────────

export interface WorkflowAnalysisPlan {
  capabilities: CapabilityPack[];
  orderedChecks: string[];
  outputSections: string[];
}

// ── Drafting ──────────────────────────────────────────────────

export interface WorkflowDraftPlan {
  requiredSections: string[];
  forbiddenBehavior: string[];
  validationChecks: string[];
}

// ── Submission ───────────────────────────────────────────────

export interface WorkflowSubmissionPlan {
  methods: string[];
  recipientRules: string[];
  proofRequirements: string[];
}

// ── Quality Gate ──────────────────────────────────────────────

export interface WorkflowQualityGate {
  documentRecognition: boolean;
  factGrounding: boolean;
  deadlineVerification: boolean;
  requirementCoverage: boolean;
  evidenceGrounding: boolean;
  draftValidation: boolean;
  submissionReadiness: boolean;
  proofReady: boolean;
}

// ── SEO ───────────────────────────────────────────────────────

export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: { title: string; description: string };
  faq?: { question: string; answer: string }[];
}

// ── UX ────────────────────────────────────────────────────────

export interface UXStepDef {
  id: string;
  label: string;
}

export interface UXMetadata {
  steps: UXStepDef[];
  reviewChecks: string[];
  disclaimerText: string;
  mailOptions?: { id: string; label: string; price: string; desc: string }[];
}

// ── Directory ────────────────────────────────────────────────

export interface DirectoryEntry {
  category: string;
  bestFor: string;
  steps: string[];
  documents: string[];
  seoRoute?: string;
  seoTitle?: string;
  seoDescription?: string;
}

// ── Registry Metadata (for the master registry) ───────────────

export interface RegistryMetadata {
  vertical: string;
  category: string;
  engine: WorkflowEngine;
  /** Factory reuse score: how much of this workflow reuses existing engine capabilities (0-1) */
  factoryReuseScore: number;
  /** Implementation difficulty (1-5, higher = harder) */
  implementationDifficulty: number;
  /** Priority within the build queue */
  priority?: "critical" | "high" | "medium" | "low";
  /**
   * Keyword metrics from Keyword.com — NEVER invented.
   * All fields are null/TBD until verified through the connector.
   */
  keywordMetrics?: {
    msv: number | null;
    cpc: number | null;
    competition: number | null;
    researchRequired: boolean;
  };
}

// ── Master Workflow Definition ───────────────────────────────

export interface MasterWorkflowDefinition {
  id: string;
  vertical: string;
  lifecycle: WorkflowLifecycle;
  title: string;
  description: string;
  disclaimer: string;
  engine: WorkflowEngine;
  searchIntent: SearchIntentDefinition;
  documents: DocumentDefinition[];
  deadlines: DeadlineDefinition[];
  requirements: RequirementDefinition[];
  evidence: EvidenceDefinition[];
  analysis: WorkflowAnalysisPlan;
  drafting: WorkflowDraftPlan;
  submission: WorkflowSubmissionPlan;
  capabilities: CapabilityPack[];
  qualityGate: WorkflowQualityGate;
  seo?: SEOMetadata;
  directory?: DirectoryEntry;
  ux?: UXMetadata;
  /** Registry metadata for priority scoring and factory management */
  registry?: RegistryMetadata;
}

// ── Engine Registry ───────────────────────────────────────────

export interface EngineDefinition {
  id: WorkflowEngine;
  name: string;
  description: string;
  pipeline: string[];
  usedBy: string[];
  /** Shared capabilities this engine provides */
  sharedCapabilities: CapabilityPack[];
}

export const ENGINE_REGISTRY: Record<WorkflowEngine, EngineDefinition> = {
  "document-action": {
    id: "document-action",
    name: "Document → Action",
    description: "Upload a document, classify it, extract facts, identify deadlines and requirements, produce a response.",
    pipeline: [
      "document", "classify", "extract", "understand",
      "deadline", "requirements", "action",
    ],
    usedBy: ["CP2000", "CP14", "I-797", "I-797C", "USCIS RFE", "IRS notices", "insurance denials", "summons"],
    sharedCapabilities: [
      "document-classification", "fact-extraction", "deadline-analysis",
      "requirements-analysis", "drafting", "draft-validation",
    ],
  },
  "dispute": {
    id: "dispute",
    name: "Dispute",
    description: "Claim → evidence → contradiction → applicable rules → dispute grounds → response → validation.",
    pipeline: [
      "claim", "evidence", "contradiction", "applicable-rules",
      "dispute-grounds", "response", "validation",
    ],
    usedBy: ["TransUnion", "Experian", "Equifax", "credit-report disputes", "collections", "debt disputes", "billing disputes"],
    sharedCapabilities: [
      "fact-extraction", "evidence-analysis", "contradiction-analysis",
      "requirements-analysis", "drafting", "draft-validation",
    ],
  },
  "records": {
    id: "records",
    name: "Records Request",
    description: "Record sought → jurisdiction → custodian → eligibility → request → deadline → submission → follow-up → escalation.",
    pipeline: [
      "record-type", "jurisdiction", "custodian", "eligibility",
      "required-fields", "fees", "deadline", "submission",
      "follow-up", "escalation",
    ],
    usedBy: ["police records", "court records", "public records", "FOIA", "birth records", "marriage records", "property records", "permit records"],
    sharedCapabilities: [
      "fact-extraction", "deadline-analysis", "requirements-analysis",
      "drafting", "submission", "mailing", "proof",
    ],
  },
  "appeal": {
    id: "appeal",
    name: "Appeal",
    description: "Decision → reason → applicable standard → evidence → deficiencies → appeal strategy → draft → validation.",
    pipeline: [
      "decision", "reason", "applicable-standard", "evidence",
      "deficiencies", "appeal-strategy", "draft", "validation",
    ],
    usedBy: ["insurance", "financial aid", "SSDI", "SSI", "unemployment", "Medicaid", "FEMA", "academic appeals"],
    sharedCapabilities: [
      "fact-extraction", "evidence-analysis", "contradiction-analysis",
      "requirements-analysis", "drafting", "draft-validation",
    ],
  },
  "jurisdictional": {
    id: "jurisdictional",
    name: "Jurisdictional Correspondence",
    description: "Jurisdiction → governing rules → notice → deadline → procedural requirements → evidence → response → submission.",
    pipeline: [
      "jurisdiction", "governing-rules", "notice", "deadline",
      "procedural-requirements", "evidence", "response", "submission",
    ],
    usedBy: ["tenant workflows", "code enforcement", "permits", "DMV", "local government correspondence"],
    sharedCapabilities: [
      "fact-extraction", "deadline-analysis", "requirements-analysis",
      "evidence-analysis", "drafting", "draft-validation", "submission", "mailing", "proof",
    ],
  },
};

// ── Priority Scoring ──────────────────────────────────────────

/**
 * Opportunity Score = SearchDemand × CommercialValue × Intent × Reusability × CompetitiveAdvantage ÷ ImplementationDifficulty
 *
 * All factors are 0-1 (except ImplementationDifficulty which is 1-5).
 * Keyword metrics are NEVER invented — they come from Keyword.com or are null.
 */
export interface PriorityScore {
  searchDemand: number;
  commercialValue: number;
  intent: number;
  reusability: number;
  competitiveAdvantage: number;
  implementationDifficulty: number;
  opportunityScore: number;
  factoryValue: number;
}

export function computePriorityScore(params: {
  searchDemand: number;
  commercialValue: number;
  intent: number;
  reusability: number;
  competitiveAdvantage: number;
  implementationDifficulty: number;
  workflowsUnlocked: number;
}): PriorityScore {
  const opportunity =
    (params.searchDemand *
      params.commercialValue *
      params.intent *
      params.reusability *
      params.competitiveAdvantage) /
    params.implementationDifficulty;

  const factoryValue =
    params.workflowsUnlocked * params.reusability * params.searchDemand;

  return {
    searchDemand: params.searchDemand,
    commercialValue: params.commercialValue,
    intent: params.intent,
    reusability: params.reusability,
    competitiveAdvantage: params.competitiveAdvantage,
    implementationDifficulty: params.implementationDifficulty,
    opportunityScore: opportunity,
    factoryValue: factoryValue,
  };
}
