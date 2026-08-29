export const appealReplyProduct = {
  name: "AppealReply",
  tagline: "Turn a denial into a documented appeal.",
  description: "Understand a decision, identify the deadline and reasons, build a supported appeal, and preserve proof of what you sent.",
  workflow: [
    "Upload the decision or denial",
    "Extract and verify the critical facts",
    "Identify appeal grounds and missing evidence",
    "Build the formal appeal",
    "Assemble the evidence packet",
    "Mail it with proof and track the record",
  ],
  decisionTypes: [
    "Benefits denial",
    "Insurance claim denial",
    "Fine or penalty",
    "Permit or licensing decision",
    "Code or property decision",
    "Other administrative decision",
  ],
} as const;

export type AppealDecisionType = typeof appealReplyProduct.decisionTypes[number];

// Phase A: Document analysis
export type { AppealAnalysis, Confidence, ExtractedField } from "./intelligence";
export { APPEAL_ANALYSIS_PROMPT } from "./intelligence";
export { analyzeAppealPdfWithClaude } from "./claude";

// Phase B: Case intelligence
export type {
  AppealCaseAnalysis,
  AppealIssue,
  AppealPoint,
  EvidenceRequest,
  Contradiction,
  UserQuestion,
  AppealGround,
  RecommendedAction,
  DecisionSummaryBlock,
  VerifiedFacts,
  AnalyzeCaseInput,
  IssueStatus,
  EvidenceSource,
  SupportLevel,
  ActionStatus,
} from "./case-analysis";

export {
  AppealCaseAnalysisSchema,
  AnalyzeCaseInputSchema,
} from "./case-analysis";

export { analyzeAppealCaseWithClaude } from "./case-claude";

// Phase C: Evidence-linked appeal drafting
export type {
  AppealDraft,
  AppealSection,
  EvidenceReference,
  Exhibit,
  ExhibitStatus,
  AddressBlock,
  DraftAppealInput,
  QuestionAnswers,
} from "./draft-model";

export {
  AppealDraftSchema,
  DraftAppealInputSchema,
} from "./draft-model";

export { draftAppealWithClaude } from "./draft-claude";
