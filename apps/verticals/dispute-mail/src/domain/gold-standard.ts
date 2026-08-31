import { z } from "zod";
import type { WorkflowProfile } from "./workflow-profiles";

export const disputeFindingStateSchema = z.enum(["confirmed", "discrepancy", "missing", "ambiguous", "requires_verification", "unsupported"]);
export type DisputeFindingState = z.infer<typeof disputeFindingStateSchema>;

export const disputeFindingSchema = z.object({ id: z.string(), state: disputeFindingStateSchema, title: z.string(), detail: z.string(), sourceExcerpt: z.string().optional(), severity: z.enum(["high", "medium", "low"]) });
export type DisputeFinding = z.infer<typeof disputeFindingSchema>;

export const evidenceItemSchema = z.object({ id: z.string(), description: z.string(), status: z.enum(["missing", "requested", "provided", "verified", "rejected", "not_applicable"]), supportsFindingIds: z.array(z.string()).default([]) });
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const disputeAnalysisSchema = z.object({
  documentId: z.string(), classification: z.object({ type: z.string(), confidence: z.number().min(0).max(1) }), facts: z.array(z.object({ label: z.string(), value: z.string(), sourceExcerpt: z.string().optional() })), findings: z.array(disputeFindingSchema), evidence: z.array(evidenceItemSchema), strategy: z.array(z.string()), blockingIssues: z.array(z.string()),
});
export type DisputeAnalysis = z.infer<typeof disputeAnalysisSchema>;

function missingFinding(id: string, title: string, detail: string): DisputeFinding { return { id, state: "missing", title, detail, severity: "high" }; }
function slugify(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function analyzeDisputeWorkflowInput(input: { documentId: string; text: string; profile: WorkflowProfile; workflowFacts?: Record<string, string | undefined>; evidenceStatuses?: Record<string, EvidenceItem["status"]>; objective?: string }): DisputeAnalysis {
  const text = input.text.trim(); const factsInput = input.workflowFacts ?? {}; const evidenceStatuses = input.evidenceStatuses ?? {}; const objective = input.objective?.trim() ?? "";
  const findings: DisputeFinding[] = []; const evidence: EvidenceItem[] = []; const blockingIssues: string[] = [];
  if (!text) { findings.push(missingFinding("source-text", "Source document missing", "A source document must be available before dispute findings can be grounded.")); blockingIssues.push("Source document text is required."); }
  for (const requirement of input.profile.requiredFacts) {
    const key = requirement.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
    const value = Object.entries(factsInput).find(([name, candidate]) => Boolean(candidate) && (name.toLowerCase() === key.toLowerCase() || name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())))?.[1];
    if (!value?.trim()) { const id = `required-${key}`; findings.push(missingFinding(id, `Missing ${requirement}`, `Provide ${requirement} before the dispute can be approved.`)); evidence.push({ id: `evidence-${id}`, description: `User-provided information establishing ${requirement}`, status: "missing", supportsFindingIds: [id] }); blockingIssues.push(`${requirement} is required.`); }
    else findings.push({ id: `fact-${key}`, state: "confirmed", title: `Provided ${requirement}`, detail: `User provided ${requirement}.`, severity: "medium", sourceExcerpt: value.slice(0, 500) });
  }
  for (const requirement of input.profile.evidenceRequirements) {
    const id = `evidence-${slugify(requirement)}`;
    const status = evidenceStatuses[id] ?? "requested";
    evidence.push({ id, description: requirement, status, supportsFindingIds: [] });
    if (status === "missing" || status === "requested" || status === "rejected") blockingIssues.push(`Evidence required: ${requirement}`);
  }
  if (!objective) { findings.push(missingFinding("objective", "Requested outcome missing", input.profile.objectivePrompt)); blockingIssues.push("A specific requested outcome is required."); }
  else findings.push({ id: "objective", state: "confirmed", title: "Requested outcome supplied", detail: objective, severity: "medium", sourceExcerpt: objective.slice(0, 500) });
  if (text) findings.push({ id: "source-present", state: "confirmed", title: "Source document available", detail: "The workflow has source material that can be checked against the user's factual assertions.", severity: "low" });
  const strategy = [`Address the dispute to the ${input.profile.recipientRole}.`, `Build the letter around the requested outcome: ${input.profile.outcome}`, `Use the profile deadline policy: ${input.profile.deadlinePolicy}`, "Resolve missing and requested evidence before explicit approval.", "Preserve source-grounded facts and avoid unsupported legal conclusions or guarantees."];
  return disputeAnalysisSchema.parse({ documentId: input.documentId, classification: { type: input.profile.id, confidence: text ? 0.9 : 0 }, facts: Object.entries(factsInput).filter(([, value]) => Boolean(value?.trim())).map(([label, value]) => ({ label, value: value!, sourceExcerpt: value!.slice(0, 500) })), findings, evidence, strategy, blockingIssues });
}

export function analyzeCreditReportInput(input: { documentId: string; text: string; bureau?: string; accountNumber?: string; reportDate?: string; errorType?: string; facts?: string; objective?: string }): DisputeAnalysis {
  const text = input.text.trim(); const facts = input.facts?.trim() ?? ""; const objective = input.objective?.trim() ?? ""; const findings: DisputeFinding[] = []; const evidence: EvidenceItem[] = []; const blockingIssues: string[] = [];
  const addMissing = (id: string, title: string, detail: string) => { findings.push({ id, state: "missing", title, detail, severity: "high" }); evidence.push({ id: `evidence-${id}`, description: detail, status: "missing", supportsFindingIds: [id] }); blockingIssues.push(detail); };
  if (!text) addMissing("source-text", "Source document text missing", "A source document must be available before findings can be grounded.");
  if (!input.bureau) addMissing("bureau", "Credit bureau not identified", "Identify the bureau receiving the dispute before mailing.");
  if (!facts) addMissing("facts", "User facts missing", "Describe the disputed item and why it is inaccurate using verifiable facts.");
  if (!objective) addMissing("objective", "Requested correction missing", "State what correction or investigation the user is requesting.");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); const normalizedFacts = [input.bureau ? { label: "credit_bureau", value: input.bureau } : null, input.accountNumber ? { label: "account_reference", value: input.accountNumber } : null, input.reportDate ? { label: "report_date", value: input.reportDate } : null, input.errorType ? { label: "error_type", value: input.errorType } : null].filter((value): value is { label: string; value: string } => Boolean(value));
  if (input.accountNumber && !text.includes(input.accountNumber)) { const id = "account-reference-not-found"; findings.push({ id, state: "requires_verification", title: "Account/reference number not found in supplied text", detail: "Verify the account/reference number against the uploaded source document before mailing.", severity: "medium" }); evidence.push({ id: `evidence-${id}`, description: "Source document containing the disputed account/reference number", status: "requested", supportsFindingIds: [id] }); }
  if (input.reportDate && lines.length > 0 && !text.includes(input.reportDate)) findings.push({ id: "report-date-not-found", state: "requires_verification", title: "Report date not found in supplied text", detail: "Verify the report date against the uploaded source document before relying on it in the dispute.", severity: "low" });
  if (facts) findings.push({ id: "user-facts-present", state: "confirmed", title: "User supplied dispute facts", detail: "The workflow has user-provided factual assertions that can be reviewed against source evidence.", severity: "medium", sourceExcerpt: facts.slice(0, 500) });
  const strategy: string[] = []; if (input.bureau) strategy.push(`Address the dispute to ${input.bureau} and identify the specific item under dispute.`); if (facts) strategy.push("Use only verifiable facts and preserve the user's wording where it can be supported by the source documents."); if (objective) strategy.push(`Request the specific correction described by the user: ${objective.slice(0, 300)}`); if (evidence.length) strategy.push("Resolve missing or verification-required evidence before approval and mailing.");
  return disputeAnalysisSchema.parse({ documentId: input.documentId, classification: { type: "credit-report-dispute", confidence: text ? 0.9 : 0 }, facts: normalizedFacts.map((item) => ({ ...item, sourceExcerpt: undefined })), findings, evidence, strategy, blockingIssues });
}

export function canApproveDispute(analysis: DisputeAnalysis): boolean {
  const unresolvedEvidence = analysis.evidence.some((item) => item.status === "missing" || item.status === "requested" || item.status === "rejected");
  const unresolvedFindings = analysis.findings.some((finding) => finding.state === "missing" || finding.state === "requires_verification" || finding.state === "unsupported" || finding.state === "ambiguous");
  return analysis.blockingIssues.length === 0 && !unresolvedEvidence && !unresolvedFindings;
}

export function canAuthorizeDisputeMail(params: { analysis: DisputeAnalysis; draftValidated: boolean; humanApproved: boolean; recipientComplete: boolean; paymentComplete: boolean }): boolean {
  return canApproveDispute(params.analysis) && params.draftValidated && params.humanApproved && params.recipientComplete && params.paymentComplete;
}
export function canCompleteDisputeProof(params: { trackingNumber: string | null; proofReady: boolean }): boolean { return Boolean(params.trackingNumber) && params.proofReady; }
export function canSubmitDispute(params: { analysis: DisputeAnalysis; draftValidated: boolean; humanApproved: boolean; recipientComplete: boolean; proofReady: boolean; paymentComplete?: boolean }): boolean {
  return canAuthorizeDisputeMail({ analysis: params.analysis, draftValidated: params.draftValidated, humanApproved: params.humanApproved, recipientComplete: params.recipientComplete, paymentComplete: params.paymentComplete ?? false });
}
