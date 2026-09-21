import { z } from "zod";
import { CaseError } from "./case.server";
import { NOTICE_WORKFLOW_CONFIGS, type NoticeWorkflowId } from "../notice-workflow-registry";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a real calendar date").nullable();
const text = z.string().trim().min(1).max(16000);
const cp2000FindingSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  statement: text,
  supportingFacts: z.array(text).max(100),
  provenance: z.array(z.never()).max(100),
  sourceReferences: z.array(text).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  recommendedAction: text,
  unresolved: z.boolean(),
  analysisRule: text,
});
const cp2000DiscrepancySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["amount_mismatch", "wrong_tax_year", "documentation_gap"]),
  description: text,
  irsAmount: text.nullable(),
  userAmount: text.nullable(),
  difference: text.nullable(),
  possibleExplanations: z.array(text).max(100),
  evidenceNeeded: z.array(text).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["unresolved", "user_correct", "irs_correct", "unclear"]),
  findingId: z.string().min(1),
});
const cp2000AnalysisSchema = z.object({
  discrepancies: z.array(cp2000DiscrepancySchema).max(100),
  findings: z.array(cp2000FindingSchema).max(100),
  unresolvedCount: z.number().int().nonnegative(),
  totalIssues: z.number().int().nonnegative(),
  evidenceChecklist: z.object({
    items: z.array(z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      label: text,
      purpose: text,
      requirement: z.enum(["required", "recommended", "optional"]),
      state: z.enum(["missing", "provided"]),
      supportsFindingIds: z.array(z.string().min(1)).max(100),
      supportsDiscrepancyIds: z.array(z.string().min(1)).max(100),
    })).max(100),
    requiredCount: z.number().int().nonnegative(),
    providedCount: z.number().int().nonnegative(),
    missingCount: z.number().int().nonnegative(),
    complete: z.boolean(),
    ready: z.boolean(),
  }).optional(),
}).nullable().default(null);
const workflowDetailsSchema = z.object({
  taxYear: z.string().regex(/^\d{4}$/).nullable().default(null),
  amountDue: text.nullable().default(null),
  proposedTax: text.nullable().default(null),
  proposedPenalty: text.nullable().default(null),
  proposedInterest: text.nullable().default(null),
  proposedIncomeChanges: z.array(text).max(100).default([]),
  payerReferences: z.array(text).max(100).default([]),
  reportedIncome: text.nullable().default(null),
  irsReportedIncome: text.nullable().default(null),
  incomeSource: text.nullable().default(null),
  cp2000Analysis: cp2000AnalysisSchema,
  responseAddress: z.object({
    line1: text,
    line2: text.nullable().default(null),
    city: text,
    state: z.string().trim().regex(/^[A-Za-z]{2}$/),
    postal: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  }).nullable().default(null),
  paymentInstructions: text.nullable().default(null),
}).default({
  taxYear: null,
  amountDue: null,
  proposedTax: null,
  proposedPenalty: null,
  proposedInterest: null,
  proposedIncomeChanges: [],
  payerReferences: [],
  reportedIncome: null,
  irsReportedIncome: null,
  incomeSource: null,
  cp2000Analysis: null,
  responseAddress: null,
  paymentInstructions: null,
});

const noticeAnalysisSchema = z.object({
  decision: text.nullable(), issuer: text.nullable(), referenceNumber: text.nullable(),
  decisionDate: date, deadline: date,
  confidence: z.enum(["high", "medium", "low"]), summary: text,
  reasons: z.array(text).max(100), missingInformation: z.array(text).max(100),
  suggestedEvidence: z.array(text).max(100), promptInjectionObserved: z.boolean(),
  workflowDetails: workflowDetailsSchema,
});

export type NoticeAnalysis = z.infer<typeof noticeAnalysisSchema>;

export function validateNoticeAnalysis(value: unknown): NoticeAnalysis {
  const result = noticeAnalysisSchema.safeParse(value);
  if (!result.success) throw new CaseError("The notice analysis is incomplete or invalid. Analyze the notice again.");
  return result.data;
}

export interface CaseWorkflowDefinition {
  readonly id: string;
  readonly verticalId: string;
  readonly noticeFamily: "benefits" | "irs";
  readonly responseModes: readonly string[];
  readonly analysisInstructions: string;
  readonly draftInstructions: string;
}

// Register execution only when the case service supports the workflow. The
// public page catalog is discovery content, not permission to run a generic flow.
const ssdi: CaseWorkflowDefinition = Object.freeze({
  id: "ssdi-denial",
  verticalId: "appeal-mail",
  noticeFamily: "benefits",
  responseModes: ["reconsideration"],
  analysisInstructions:
    "This workflow prepares a response to an SSDI denial notice. Identify the " +
    "decision, stated reasons and appeal stage only if the notice supplies them. " +
    "Distinguish medical reasons from work or other eligibility reasons in the summary. " +
    "If this is not an SSDI denial, report that mismatch in missingInformation. " +
    "Never calculate an appeal deadline from a general rule. Treat suggested medical " +
    "or work-history evidence as suggestions, not evidence already supplied.",
  draftInstructions:
    "Prepare an SSDI denial response addressing only the reasons stated in the analysis. " +
    "Do not invent diagnoses, functional limitations, work history, an appeal stage " +
    "or a requested statutory form. An enclosure kind is only a label: its contents " +
    "have not been read, so do not claim it proves disability or contradicts a finding. " +
    "Do not describe this letter as completing or filing an appeal.",
});

const cp14: CaseWorkflowDefinition = Object.freeze({
  id: "cp14-response",
  verticalId: "notice-response",
  noticeFamily: "irs",
    responseModes: NOTICE_WORKFLOW_CONFIGS["cp14-response"].modes.map(([value]) => value),
  analysisInstructions:
    "This workflow prepares a response to an IRS CP14 balance-due notice. Confirm " +
    "that the document identifies itself as CP14 or an equivalent balance-due notice. " +
    "Extract the tax year, notice date, response deadline if shown, amount due, " +
    "payment instructions, notice/reference number, and the IRS response address. " +
    "Do not turn a balance shown on the notice into a legal conclusion or calculate " +
    "interest, penalties, or a deadline that is not printed on the document.",
  draftInstructions:
    "Prepare a factual CP14 response using only verified notice facts and the user's " +
    "selected response mode and facts. Distinguish payment, disagreement, installment " +
    "request, and time-to-pay requests. Never claim payment was made, invent an amount, " +
    "cite a tax authority, or promise that the IRS will accept the request.",
});



const cp523: CaseWorkflowDefinition = Object.freeze({
  id: "cp523-response",
  verticalId: "notice-response",
  noticeFamily: "irs",
  responseModes: NOTICE_WORKFLOW_CONFIGS["cp523-response"].modes.map(([value]) => value),
  analysisInstructions:
    "This workflow prepares a response to an IRS CP523 installment-agreement default notice. " +
    "Confirm that the document identifies itself as CP523, CP523 (SP), or the corresponding " +
    "installment-agreement default notice. Extract the tax period, notice date, termination " +
    "date or response deadline only if printed, past-due amount, notice/reference number, " +
    "reason for default if stated, payment instructions, and IRS contact/response information. " +
    "Distinguish the past-due amount needed to cure the default from the total unpaid liability " +
    "when the notice distinguishes them. Never calculate a deadline or infer why a payment was missed.",
  draftInstructions:
    "Prepare a factual CP523 response using only verified notice facts and the user's selected " +
    "response mode. Distinguish curing the past-due payment, already-taken corrective action, " +
    "disagreement with the stated default, a request to discuss reinstatement, and inability to " +
    "pay the past-due amount. Reference only evidence actually enclosed. Do not represent the " +
    "letter as Form 9423 or another formal appeal request, do not promise reinstatement, and do " +
    "not invent missed-payment reasons, financial facts, eligibility, deadlines, or outcomes.",
});

const cp504: CaseWorkflowDefinition = Object.freeze({
  id: "cp504-response",
  verticalId: "notice-response",
  noticeFamily: "irs",
  responseModes: NOTICE_WORKFLOW_CONFIGS["cp504-response"].modes.map(([value]) => value),
  analysisInstructions:
    "This workflow prepares a response to an IRS CP504 Notice of Intent to Levy. Confirm " +
    "that the document identifies itself as CP504. Extract the tax year, notice date, " +
    "response deadline only if printed, notice/reference number, amount due, payment " +
    "instructions, collection warnings, and the IRS response address. Preserve the " +
    "difference between CP504, the Collection Appeals Program, and a later Collection Due " +
    "Process notice. Never calculate a deadline, state that a generic letter stops collection, " +
    "or infer that a formal appeal has been filed.",
  draftInstructions:
    "Prepare a factual CP504 response using only verified notice facts and the user's selected " +
    "response mode. Distinguish payment, already-paid/account-correction, disagreement, payment-" +
    "arrangement, offer-in-compromise inquiry, and hardship-status requests. Reference only " +
    "evidence actually enclosed. Do not represent the letter as Form 9423, a CAP request, a CDP " +
    "request, or a guarantee that collection activity will stop. Do not invent payment history, " +
    "financial hardship facts, eligibility, deadlines, tax authorities, or outcomes.",
});

const cp2000: CaseWorkflowDefinition = Object.freeze({
  id: "cp2000-response",
  verticalId: "notice-response",
  noticeFamily: "irs",
  responseModes: NOTICE_WORKFLOW_CONFIGS["cp2000-response"].modes.map(([value]) => value),
  analysisInstructions:
    "This workflow prepares a response to an IRS CP2000 proposed-underreporter notice. " +
    "Confirm that the document identifies itself as CP2000. Extract the tax year, notice " +
    "date, response deadline if shown, notice/reference number, proposed income changes, " +
    "proposed tax/penalty/interest amounts, payer or information-return references, and " +
    "the IRS response address. Treat every amount as proposed unless the notice says " +
    "otherwise. Do not call it a bill, calculate a deadline, or infer agreement.",
  draftInstructions:
    "Prepare a factual CP2000 response using only verified notice facts and the user's " +
    "selected agree, disagree, or partial-agreement mode. For disagreement, identify " +
    "which proposed items the user disputes and reference only evidence actually enclosed. " +
    "Never invent tax-return figures, payer records, authorities, payments, or outcomes.",
});

const NOTICE_WORKFLOW_DEFINITIONS = {
  "cp14-response": cp14,
  "cp2000-response": cp2000,
  "cp504-response": cp504,
  "cp523-response": cp523,
} as const satisfies Record<NoticeWorkflowId, CaseWorkflowDefinition>;

const WORKFLOW_DEFINITIONS: readonly CaseWorkflowDefinition[] = [
  ssdi,
  ...Object.values(NOTICE_WORKFLOW_DEFINITIONS),
];

// "notice-response" is this module's original vertical id for the embedded
// /notice/$ case UI. The canonical new-architecture vertical id for the same
// IRS notice workflows (packages/workflows domain pack, notice-respond/) is
// "notice-respond" — a one-letter rename that happened elsewhere and was
// never mirrored here. Both ids identify the same workflow family, so treat
// them as interchangeable rather than picking one and breaking the other.
const NOTICE_VERTICAL_ALIASES = new Set(["notice-response", "notice-respond"]);

function verticalIdsMatch(definitionVerticalId: string, requestedVerticalId: string): boolean {
  if (definitionVerticalId === requestedVerticalId) return true;
  return (
    NOTICE_VERTICAL_ALIASES.has(definitionVerticalId) &&
    NOTICE_VERTICAL_ALIASES.has(requestedVerticalId)
  );
}

export function resolveCaseWorkflow(workflowId: string, verticalId: string): CaseWorkflowDefinition {
  const workflow = WORKFLOW_DEFINITIONS.find(
    (candidate) => candidate.id === workflowId && verticalIdsMatch(candidate.verticalId, verticalId),
  );
  if (workflow) return workflow;
  throw new CaseError("This workflow does not yet have an enabled case runtime.");
}

interface DraftDocument {
  document_id: string;
  role: string;
  included: boolean;
  usable: boolean;
}

export function assertDraftReady(
  analysisDocumentId: string,
  analysis: NoticeAnalysis,
  documents: readonly DraftDocument[],
): void {
  const notice = documents.find((document) => document.role === "subject_notice");
  if (!notice || notice.document_id !== analysisDocumentId)
    throw new CaseError("The notice has changed. Analyze the current notice before drafting.");
  if (!notice.usable)
    throw new CaseError("The source notice must pass security checks before drafting.");
  if (documents.some((document) => document.role === "evidence" && document.included && !document.usable))
    throw new CaseError("All included supporting documents must pass security checks before drafting.");
  if (analysis.promptInjectionObserved)
    throw new CaseError("The notice analysis reported embedded instructions. Review the notice before generating a draft.");
}
