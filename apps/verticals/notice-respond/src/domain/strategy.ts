import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   STRATEGY RECOMMENDATION ENGINE
   Recommends response strategies based on the analysis.
   Deterministic — no LLM calls.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeType } from "./notice-type";

export const strategyTypeSchema = z.enum([
  "factual_correction",
  "payment_plan",
  "dispute_full",
  "dispute_partial",
  "appeal_rights",
  "request_extension",
  "request_hearing",
  "foia_request",
  "compliance_acknowledgment",
  "supplemental_submission",
  "no_response_needed",
]);
export type StrategyType = z.infer<typeof strategyTypeSchema>;

export const strategySchema = z.object({
  id: z.string(),
  type: strategyTypeSchema,
  description: z.string(),
  reason: z.string().default(""),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  risks: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
});
export type Strategy = z.infer<typeof strategySchema>;

export const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  factual_correction: "Factual Correction",
  payment_plan: "Request Payment Plan",
  dispute_full: "Full Dispute",
  dispute_partial: "Partial Dispute",
  appeal_rights: "Exercise Appeal Rights",
  request_extension: "Request Extension",
  request_hearing: "Request Hearing",
  foia_request: "FOIA Request/Appeal",
  compliance_acknowledgment: "Acknowledge and Comply",
  supplemental_submission: "Supplemental Submission",
  no_response_needed: "No Response Needed",
};

export interface StrategyRecommendationInput {
  noticeType: NoticeType;
  hasDeadline: boolean;
  deadlineExpired: boolean;
  hasContradictions: boolean;
  hasUnsupportedAllegations: boolean;
  hasEvidence: boolean;
  hasMissingInformation: boolean;
  hasProceduralIssues: boolean;
  hasPaymentDemand: boolean;
  hasAppealRights: boolean;
  factConfidence: "high" | "medium" | "low";
}

export function recommendStrategies(input: StrategyRecommendationInput): Strategy[] {
  const strategies: Strategy[] = [];

  /* ── Factual correction when facts are confident ── */
  if (input.factConfidence === "high" && !input.hasContradictions) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "factual_correction",
      description: "Respond with corrected facts supported by documentation. Assert that the notice contains factual errors and provide the correct information.",
      reason: "High-confidence facts were extracted and no contradictions detected. A factual correction response is appropriate.",
      confidence: "high",
      risks: ["If your corrections are not accepted, you may need to escalate to an appeal."],
      prerequisites: ["Verify all corrected facts against your records", "Gather supporting documentation"],
    }));
  }

  /* ── Dispute when unsupported allegations exist ── */
  if (input.hasUnsupportedAllegations || input.hasContradictions) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "dispute_full",
      description: "Dispute the notice in full by challenging the factual basis and providing contradicting evidence.",
      reason: "Unsupported allegations or contradictions were detected. A full dispute may be warranted.",
      confidence: "medium",
      risks: ["Full disputes can take longer to resolve", "May trigger further investigation"],
      prerequisites: ["Gather all contradicting evidence", "Be prepared for follow-up questions"],
    }));
  }

  /* ── Partial dispute when there's a mix ── */
  if (input.hasEvidence && input.factConfidence !== "low") {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "dispute_partial",
      description: "Accept some aspects of the notice while disputing specific items with supporting evidence.",
      reason: "Evidence is available and fact confidence is reasonable. A partial dispute allows targeted challenges.",
      confidence: "medium",
      risks: ["Partial acceptance may be treated as full acceptance in some contexts"],
      prerequisites: ["Clearly identify which items you accept and which you dispute", "Provide evidence for disputed items"],
    }));
  }

  /* ── Payment plan when there's a payment demand ── */
  if (input.hasPaymentDemand && !input.deadlineExpired) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "payment_plan",
      description: "Acknowledge the balance and request a payment plan or installment agreement.",
      reason: "The notice includes a payment demand and the deadline has not expired. A payment plan may be available.",
      confidence: "high",
      risks: ["Interest and penalties may continue to accrue", "Payment plans may have setup fees"],
      prerequisites: ["Know how much you can pay per month", "Be prepared to provide financial information"],
    }));
  }

  /* ── Appeal rights ── */
  if (input.hasAppealRights) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "appeal_rights",
      description: "Exercise your appeal rights by filing a formal appeal with the appropriate body.",
      reason: "The notice explicitly states you have appeal rights. This preserves your options.",
      confidence: "high",
      risks: ["Appeals have strict deadlines", "May require additional documentation or representation"],
      prerequisites: ["Confirm the appeal deadline", "Understand the appeal process for this agency"],
    }));
  }

  /* ── Extension request when deadline is urgent ── */
  if (input.hasDeadline && !input.deadlineExpired && input.hasMissingInformation) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "request_extension",
      description: "Request an extension of the response deadline while you gather missing information.",
      reason: "The deadline has not expired and information is missing. An extension may provide additional time.",
      confidence: "medium",
      risks: ["Extensions are not guaranteed", "Some agencies do not offer extensions"],
      prerequisites: ["Contact the agency before the deadline expires", "Explain what information you are gathering"],
    }));
  }

  /* ── Hearing request ── */
  if (input.hasProceduralIssues || input.noticeType === "license_suspension") {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "request_hearing",
      description: "Request a formal hearing to contest the proposed action.",
      reason: "Procedural issues were detected or this notice type typically allows for hearings.",
      confidence: "high",
      risks: ["Hearings may require legal representation", "Strict deadlines for hearing requests"],
      prerequisites: ["Confirm hearing request deadline", "Consider consulting an attorney"],
    }));
  }

  /* ── Supplemental submission ── */
  if (input.hasEvidence && !input.hasContradictions) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "supplemental_submission",
      description: "Provide supplemental documentation to support your position without disputing the notice.",
      reason: "Evidence is available and no contradictions detected. A supplemental submission may resolve the matter.",
      confidence: "medium",
      risks: ["May not change the outcome if the notice is factually correct"],
      prerequisites: ["Organize documents clearly", "Include a cover letter explaining each document"],
    }));
  }

  /* ── Compliance acknowledgment ── */
  if (input.factConfidence === "high" && !input.hasContradictions && !input.hasUnsupportedAllegations) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "compliance_acknowledgment",
      description: "Acknowledge the notice and confirm compliance with the requirements.",
      reason: "Facts are high-confidence with no contradictions or unsupported allegations. The notice appears correct.",
      confidence: "high",
      risks: ["Only appropriate if you agree with the notice"],
      prerequisites: ["Review the notice carefully", "Confirm you can meet the requirements"],
    }));
  }

  /* ── Fallback: always at least one strategy ── */
  if (strategies.length === 0) {
    strategies.push(strategySchema.parse({
      id: crypto.randomUUID(),
      type: "supplemental_submission",
      description: "Provide a written response with any supporting information and documentation.",
      reason: "A written response with supporting documentation is always better than no response.",
      confidence: "low",
      risks: ["May not address the core issue"],
      prerequisites: ["Review the notice", "Gather relevant documents"],
    }));
  }

  return strategies;
}
