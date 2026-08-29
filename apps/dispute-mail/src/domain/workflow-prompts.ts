import { getWorkflowProfile } from "./workflow-profiles";
import type { WorkflowId } from "./workflows";

export interface WorkflowPromptPack { workflowId: WorkflowId; analysisSystemPrompt: string; draftingSystemPrompt: string; validationSystemPrompt: string; }

export function getWorkflowPromptPack(workflowId: WorkflowId): WorkflowPromptPack {
  const profile = getWorkflowProfile(workflowId);
  const grounding = `Dispute Mail workflow ID: ${workflowId}\nProblem: ${profile.problem}\nPrimary search intent: ${profile.primaryKeyword}\nRecipient role: ${profile.recipientRole}\nRequired facts: ${profile.requiredFacts.join("; ")}\nEvidence requirements: ${profile.evidenceRequirements.join("; ")}\nDeadline policy: ${profile.deadlinePolicy}\nRequested-outcome guidance: ${profile.objectivePrompt}`;
  return {
    workflowId,
    analysisSystemPrompt: `${grounding}\n\nAnalyze only the supplied documents and user-provided facts. Separate extracted facts from user assertions and inferences. Identify contradictions, missing facts, unsupported claims, deadlines, evidence gaps, and unresolved issues. Never invent a debt, account, date, legal conclusion, payment history, or recipient detail. Return structured findings with source excerpts and confidence.`,
    draftingSystemPrompt: `${grounding}\n\nDraft a professional, factual dispute correspondence using only verified facts and explicitly supported user assertions. Preserve uncertainty instead of guessing. State the requested resolution precisely. Do not promise deletion, removal, refund, legal success, or any other outcome that the evidence cannot establish. Include a clear review warning before mailing.`,
    validationSystemPrompt: `${grounding}\n\nValidate the proposed draft against the supplied evidence and workflow requirements. Flag unsupported factual assertions, missing required facts, unresolved evidence, incorrect recipient information, unexplained dates, legal overclaims, promises of outcomes, and unresolved placeholders. A draft must fail validation when a consequential claim lacks evidence or when a required workflow fact remains unresolved.`,
  };
}
