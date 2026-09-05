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
  readonly analysisInstructions: string;
  readonly draftInstructions: string;
}

// Register execution only when the case service supports the workflow. The
// public page catalog is discovery content, not permission to run a generic flow.
const ssdi: CaseWorkflowDefinition = Object.freeze({
  id: "ssdi-denial",
  verticalId: "appeal-mail",
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

export function resolveCaseWorkflow(workflowId: string, verticalId: string): CaseWorkflowDefinition {
  if (workflowId === ssdi.id && verticalId === ssdi.verticalId) return ssdi;
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
