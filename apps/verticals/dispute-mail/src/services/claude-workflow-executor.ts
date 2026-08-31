import { canAuthorizeDisputeMail, canCompleteDisputeProof, canApproveDispute, type DisputeAnalysis } from "@/domain/gold-standard";
import type { WorkflowId } from "@/domain/workflows";
import { analyzeWithClaude, draftWithClaude, validateDraftWithClaude } from "./claude-dispute";
import type { WorkflowConsequentialState, WorkflowExecutionResult } from "@/domain/workflow-executor";

export interface ClaudeWorkflowRequest {
  workflowId: WorkflowId;
  documentId: string;
  text: string;
  facts?: Record<string, string | undefined>;
  evidenceStatuses?: Record<string, "missing" | "requested" | "provided" | "verified" | "rejected" | "not_applicable">;
  objective?: string;
  consequential?: WorkflowConsequentialState | null;
}

function stagesFromAnalysis(analysis: DisputeAnalysis, draftPresent: boolean, validationPassed: boolean, validationIssues: string[]): WorkflowExecutionResult["stages"] {
  return [
    { stage: "secure-ingest", status: "passed", detail: "source document supplied" },
    { stage: "classify", status: "passed", detail: analysis.classification.type },
    { stage: "extract", status: analysis.facts.length > 0 ? "passed" : "failed", detail: `${analysis.facts.length} facts returned by Claude` },
    { stage: "facts-provenance", status: analysis.facts.length > 0 ? "passed" : "failed", detail: "structured facts returned with source-aware contract" },
    { stage: "timeline-deadlines", status: "passed", detail: "deadline review included in workflow prompt contract" },
    { stage: "issues-discrepancies", status: "passed", detail: `${analysis.findings.length} findings returned by Claude` },
    { stage: "evidence", status: "passed", detail: `${analysis.evidence.length} evidence items returned and coverage-validated` },
    { stage: "strategy", status: analysis.strategy.length > 0 ? "passed" : "failed", detail: `${analysis.strategy.length} strategy points` },
    { stage: "blocking-gates", status: analysis.blockingIssues.length === 0 ? "passed" : "failed", error: analysis.blockingIssues.length ? analysis.blockingIssues.join("; ") : undefined },
    { stage: "draft", status: draftPresent ? "passed" : "blocked" },
    { stage: "draft-provenance", status: draftPresent ? "passed" : "blocked" },
    { stage: "validate", status: validationPassed ? "passed" : "failed", error: validationPassed ? undefined : validationIssues.join("; ") },
  ];
}

export async function runClaudeDisputeWorkflow(input: ClaudeWorkflowRequest): Promise<WorkflowExecutionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const analysis = await analyzeWithClaude({ workflowId: input.workflowId, documentId: input.documentId, text: input.text, facts: input.facts, objective: input.objective, evidenceStatuses: input.evidenceStatuses });
  if (analysis.blockingIssues.length > 0) errors.push(...analysis.blockingIssues.map((issue) => `blocking: ${issue}`));

  if (errors.length > 0) {
    return {
      workflowId: input.workflowId,
      analysis,
      draft: "",
      stages: [...stagesFromAnalysis(analysis, false, false, analysis.blockingIssues), { stage: "human-review", status: "blocked" }, { stage: "approval", status: "blocked" }, { stage: "authorized-mail", status: "blocked" }, { stage: "track", status: "blocked" }, { stage: "prove-audit", status: "blocked" }],
      ready: false,
      blocked: true,
      errors,
      warnings,
    };
  }

  const draft = await draftWithClaude({ workflowId: input.workflowId, analysis });
  const validation = await validateDraftWithClaude({ workflowId: input.workflowId, analysis, draft });
  warnings.push(...validation.issues);
  const stages = stagesFromAnalysis(analysis, true, validation.passed, validation.issues);
  let blocked = !validation.passed;
  if (!validation.passed) errors.push(...validation.issues.map((issue) => `validation: ${issue}`));

  if (blocked || !input.consequential) {
    stages.push({ stage: "human-review", status: blocked ? "blocked" : "skipped", detail: input.consequential ? undefined : "consequential state not supplied" });
    stages.push({ stage: "approval", status: blocked ? "blocked" : "skipped", detail: input.consequential ? undefined : "consequential state not supplied" });
    stages.push({ stage: "authorized-mail", status: blocked ? "blocked" : "skipped", detail: input.consequential ? undefined : "consequential state not supplied" });
    stages.push({ stage: "track", status: "blocked" });
    stages.push({ stage: "prove-audit", status: "blocked" });
  } else {
    const canApprove = canApproveDispute(analysis) && validation.passed;
    stages.push({ stage: "human-review", status: canApprove ? "passed" : "failed", error: canApprove ? undefined : "AI analysis/draft remains unresolved" });
    if (!canApprove) {
      blocked = true;
      errors.push("human-review: unresolved analysis or validation");
      stages.push({ stage: "approval", status: "blocked" }, { stage: "authorized-mail", status: "blocked" }, { stage: "track", status: "blocked" }, { stage: "prove-audit", status: "blocked" });
    } else {
      stages.push({ stage: "approval", status: input.consequential.humanApproved ? "passed" : "failed", error: input.consequential.humanApproved ? undefined : "Explicit human approval required" });
      if (!input.consequential.humanApproved) {
        blocked = true;
        errors.push("approval: explicit human approval required");
        stages.push({ stage: "authorized-mail", status: "blocked" }, { stage: "track", status: "blocked" }, { stage: "prove-audit", status: "blocked" });
      } else {
        const authorized = canAuthorizeDisputeMail({ analysis, draftValidated: true, humanApproved: true, recipientComplete: input.consequential.recipientComplete, paymentComplete: input.consequential.paymentComplete });
        const submitted = authorized && input.consequential.mailingSubmitted;
        stages.push({ stage: "authorized-mail", status: submitted ? "passed" : "failed", error: submitted ? undefined : "Mail authorization or provider submission incomplete" });
        if (!submitted) {
          blocked = true;
          errors.push("authorized-mail: fulfillment prerequisites incomplete");
          stages.push({ stage: "track", status: "blocked" }, { stage: "prove-audit", status: "blocked" });
        } else {
          const proof = canCompleteDisputeProof({ trackingNumber: input.consequential.trackingNumber, proofReady: input.consequential.proofReady });
          stages.push({ stage: "track", status: input.consequential.trackingNumber ? "passed" : "failed", error: input.consequential.trackingNumber ? undefined : "Tracking number missing" });
          stages.push({ stage: "prove-audit", status: proof ? "passed" : "failed", error: proof ? undefined : "Proof of mailing is not ready" });
          if (!proof) { blocked = true; errors.push("prove-audit: tracking or proof missing"); }
        }
      }
    }
  }

  return { workflowId: input.workflowId, analysis, draft, stages, ready: !blocked && errors.length === 0, blocked, errors, warnings };
}
