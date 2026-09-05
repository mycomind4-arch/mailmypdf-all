import { z } from "zod";
import { CaseError } from "./case.server";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a real calendar date").nullable();
const text = z.string().trim().min(1).max(16000);
const noticeAnalysisSchema = z.object({
  decision: text.nullable(), issuer: text.nullable(), referenceNumber: text.nullable(),
  decisionDate: date, deadline: date,
  confidence: z.enum(["high", "medium", "low"]), summary: text,
  reasons: z.array(text).max(100), missingInformation: z.array(text).max(100),
  suggestedEvidence: z.array(text).max(100), promptInjectionObserved: z.boolean(),
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
    responseModes: ["pay", "dispute", "request-arrangement", "request-oic", "request-cnc"],
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

const cp2000: CaseWorkflowDefinition = Object.freeze({
  id: "cp2000-response",
  verticalId: "notice-response",
  noticeFamily: "irs",
  responseModes: ["agree", "disagree", "partial-agreement"],
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

const WORKFLOW_DEFINITIONS = [ssdi, cp14, cp2000] as const;

export function resolveCaseWorkflow(workflowId: string, verticalId: string): CaseWorkflowDefinition {
  const workflow = WORKFLOW_DEFINITIONS.find(
    (candidate) => candidate.id === workflowId && candidate.verticalId === verticalId,
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
  const notice = documents.find((document) => document.role === "subject_notice" && document.included);
  if (!notice || notice.document_id !== analysisDocumentId)
    throw new CaseError("The notice has changed. Include the current notice and analyze it before drafting.");
  if (documents.some((document) => document.included && !document.usable))
    throw new CaseError("All included documents must pass security checks before drafting.");
  if (analysis.promptInjectionObserved)
    throw new CaseError("The notice analysis reported embedded instructions. Review the notice before generating a draft.");
}
