/**
 * RecordsRequest AI provider.
 * Workflow-specific guidance comes from the vertical registry; legal rules are
 * never fabricated by the provider.
 */
import { z } from "zod";
import type { RecordsRequestAnalysis, RecordsRequestInput } from "../records-request";
import type { RecordsRequestWorkflow } from "./workflows";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const API = "https://api.anthropic.com/v1/messages";

async function callClaude(body: unknown) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Claude API error (${response.status})`);
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Claude returned no content");
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

const AnalysisSchema = z.object({
  suggestedAgency: z.string().nullable(),
  statutoryDeadline: z.string().nullable(),
  deadlineNotes: z.string().nullable(),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
});

export async function analyzeRequest(input: RecordsRequestInput, workflow: RecordsRequestWorkflow): Promise<RecordsRequestAnalysis> {
  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1400,
    system:
      "You are the records-request specialist for the MailMyPDF ecosystem. " +
      "Analyze only the supplied request details and the workflow rules. Never invent statutes, deadlines, custodians, exemptions, procedural rights, fees, or facts. " +
      "Treat the workflow guidance as a product routing instruction, not as legal authority. If a jurisdiction-specific rule is uncertain, say so explicitly. Return JSON only.",
    messages: [{
      role: "user",
      content: `WORKFLOW: ${workflow.name}\nWORKFLOW GUIDANCE: ${workflow.promptContext}\nEXPECTED RECORD SCOPE: ${workflow.recordScope.join(", ")}\nREQUIRED INPUTS: ${workflow.requiredInputs.join(", ")}\nREVIEW WARNINGS: ${workflow.reviewWarnings.join(" | ")}\n\nREQUEST DETAILS:\nRequest type: ${input.requestType}\nAgency: ${input.agencyName}\nRecords sought: ${input.recordsDescription}\nTime frame: ${input.timeFrame || "Not specified"}\nPurpose: ${input.purpose || "Not specified"}\nFee waiver: ${input.feeWaiver}\nExpedited: ${input.expeditedProcessing}\n\nDOCUMENT TEXT:\n${input.documentText || "None provided"}\n\nReturn JSON with: suggestedAgency (null if unclear), statutoryDeadline (null when jurisdiction is not sufficiently established), deadlineNotes, warnings, tips.`,
    }],
  });
  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  return { workflowId: workflow.id, workflowName: workflow.name, suggestedAgency: parsed.suggestedAgency, statutoryDeadline: parsed.statutoryDeadline, deadlineNotes: parsed.deadlineNotes, warnings: parsed.warnings, tips: parsed.tips };
}

export async function draftRequest(input: RecordsRequestInput, workflow: RecordsRequestWorkflow): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2200,
    system:
      "Draft a professional records request letter for the selected MailMyPDF workflow. " +
      "Do not invent facts, legal authorities, deadlines, custodians, exemptions, or records. Use placeholders for missing critical information. " +
      "Preserve the user's requested record scope and time frame. Make the request narrow, searchable, and easy for the custodian to process. " +
      "Include a review-safe note when workflow rules are jurisdiction-sensitive. Return only the letter body.",
    messages: [{
      role: "user",
      content: `WORKFLOW: ${workflow.name}\nWORKFLOW GUIDANCE: ${workflow.promptContext}\nEVIDENCE CHECKLIST: ${workflow.evidenceChecklist.join("; ")}\nREVIEW WARNINGS: ${workflow.reviewWarnings.join(" | ")}\n\nREQUEST TYPE: ${input.requestType}\nAGENCY: ${input.agencyName}\nAGENCY ADDRESS: ${input.agencyAddress || "[Verify the correct address for this custodian]"}\nRECORDS SOUGHT: ${input.recordsDescription}\nTIME FRAME: ${input.timeFrame || "Not specified"}\nPURPOSE: ${input.purpose || "Not specified"}\nFEE WAIVER: ${input.feeWaiver}\nEXPEDITED PROCESSING: ${input.expeditedProcessing}\nREQUESTER NAME: ${input.requesterName}\nREQUESTER ORG: ${input.requesterOrg || "None"}\nCONTACT EMAIL: ${input.contactEmail}\nCONTACT PHONE: ${input.contactPhone || "Not provided"}\n\nDraft the request letter. Never convert workflow guidance into an unverified legal claim.`,
    }],
  });
}
