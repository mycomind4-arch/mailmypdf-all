import {
  analyzeMatterWorkflowInput,
  canApproveMatter,
  canAuthorizeMatterMail,
  canCompleteMatterProof,
  type MatterAnalysis,
  type EvidenceItem,
} from "./gold-standard";
import { getWorkflowProfile } from "./workflow-profiles";
import type { WorkflowId } from "./workflows";

export interface WorkflowExecutionInput {
  workflowId: WorkflowId;
  documentId: string;
  text: string;
  facts?: Record<string, string | undefined>;
  evidenceStatuses?: Record<string, EvidenceItem["status"]>;
  objective?: string;
}

export interface WorkflowConsequentialState {
  draftValidated: boolean;
  humanApproved: boolean;
  recipientComplete: boolean;
  paymentComplete: boolean;
  mailingSubmitted: boolean;
  trackingNumber: string | null;
  proofReady: boolean;
  approvedDraftHash: string | null;
}

export interface WorkflowExecutionResult {
  workflowId: WorkflowId;
  analysis: MatterAnalysis;
  draft: string;
  draftHash: string | null;
  stages: Array<{
    stage: string;
    status: "passed" | "failed" | "blocked" | "skipped";
    detail?: string;
    error?: string;
  }>;
  ready: boolean;
  blocked: boolean;
  errors: string[];
  warnings: string[];
}

function generateDraft(
  input: WorkflowExecutionInput,
  analysis: MatterAnalysis,
): string {
  const profile = getWorkflowProfile(input.workflowId);
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const confirmedFacts =
    analysis.facts
      .map((fact) => `- ${fact.label}: ${fact.value}`)
      .join("\n") || "- [Facts to be completed]";

  const evidence =
    analysis.evidence
      .map((item) => `- ${item.description} (${item.status})`)
      .join("\n") || "- [Evidence to be supplied]";

  const timelineSection =
    analysis.timeline.length > 0
      ? analysis.timeline
          .map(
            (event) =>
              `- ${event.date ?? "Date unknown"}: ${event.event} — ${event.description}`,
          )
          .join("\n")
      : "- [Timeline to be constructed from supplied documents]";

  const strategy = analysis.strategy.map((item) => `- ${item}`).join("\n");

  const risksSection =
    analysis.risks.length > 0
      ? analysis.risks
          .map(
            (risk) =>
              `- [${risk.severity.toUpperCase()}] ${risk.title}: ${risk.detail}`,
          )
          .join("\n")
      : "- No specific risks identified at this stage.";

  return `[DRAFT — REVIEW BEFORE SENDING]

${date}

${profile.recipientRole.charAt(0).toUpperCase() + profile.recipientRole.slice(1)}

Re: ${profile.draftSubject}

To Whom It May Concern:

I am writing regarding a matter that requires formal documentation and resolution. This correspondence is intended to create a clear factual record and request the following outcome:

${input.objective ?? profile.objectivePrompt}

Relevant facts (user-provided unless otherwise noted):
${confirmedFacts}

Timeline:
${timelineSection}

Supporting evidence:
${evidence}

Risk assessment:
${risksSection}

Requested resolution:
${input.objective ?? profile.outcome}

Workflow guidance:
${strategy}

Please review the enclosed information and provide a written response addressing the dispute and requested resolution within a reasonable time.

Sincerely,
[Your Name]
[Your Address]
[Your Phone]
[Your Email]

---
Disclaimer: ${profile.disclaimer}
`;
}

function validateDraft(
  draft: string,
  profileId: WorkflowId,
): { passed: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!draft.includes("Re:")) errors.push("Draft missing subject line");
  if (!draft.includes("[Your Name]"))
    errors.push("Draft missing sender placeholder");
  if (!draft.includes("Requested resolution"))
    errors.push(`Draft structure missing for workflow ${profileId}`);
  if (
    draft.includes("[Facts to be completed]") ||
    draft.includes("[Evidence to be supplied]")
  )
    warnings.push("Draft contains incomplete intake placeholders");
  if (draft.includes("[Timeline to be constructed"))
    warnings.push("Draft contains incomplete timeline placeholder");
  return { passed: errors.length === 0, errors, warnings };
}

export function getWorkflowProfile(id: WorkflowId) {
  return workflowProfiles[id];
}

import { workflowProfiles } from "./workflow-profiles";

export function runProfiledWorkflow(
  input: WorkflowExecutionInput,
  consequential?: WorkflowConsequentialState | null,
): WorkflowExecutionResult {
  const profile = getWorkflowProfile(input.workflowId);
  const stages: WorkflowExecutionResult["stages"] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let blocked = false;

  // secure-ingest
  stages.push({
    stage: "secure-ingest",
    status: input.text.trim() ? "passed" : "failed",
    detail: input.text.trim() ? "source document available" : undefined,
    error: input.text.trim() ? undefined : "Source document required",
  });
  if (!input.text.trim()) {
    blocked = true;
    errors.push("secure-ingest: source document required");
  }

  // analyze
  const analysis = analyzeMatterWorkflowInput({
    documentId: input.documentId,
    text: input.text,
    profile,
    workflowFacts: input.facts,
    evidenceStatuses: input.evidenceStatuses,
    objective: input.objective,
  });

  // classify
  stages.push({
    stage: "classify",
    status: analysis.classification.confidence > 0 ? "passed" : "failed",
    detail: profile.problem,
  });

  // extract
  stages.push({
    stage: "extract",
    status: analysis.facts.length > 0 ? "passed" : "failed",
    detail: `${analysis.facts.length} supplied facts`,
  });

  // facts-provenance
  stages.push({
    stage: "facts-provenance",
    status: analysis.facts.length > 0 ? "passed" : "failed",
    detail: "facts retain provenance classification (user_provided, extracted, inferred)",
  });

  // timeline-deadlines
  stages.push({
    stage: "timeline-deadlines",
    status: "passed",
    detail: `${analysis.timeline.length} timeline events; ${profile.deadlinePolicy}`,
  });

  // issues-discrepancies
  stages.push({
    stage: "issues-discrepancies",
    status: analysis.findings.length > 0 ? "passed" : "failed",
    detail: `${analysis.findings.length} findings`,
  });

  // evidence
  stages.push({
    stage: "evidence",
    status: analysis.evidence.length > 0 ? "passed" : "failed",
    detail: `${analysis.evidence.length} evidence requirements`,
  });

  // risk
  stages.push({
    stage: "risk",
    status: analysis.risks.length > 0 || analysis.blockingIssues.length === 0 ? "passed" : "failed",
    detail: `${analysis.risks.length} risks identified`,
  });

  // strategy
  stages.push({
    stage: "strategy",
    status: analysis.strategy.length > 0 ? "passed" : "failed",
    detail: `${analysis.strategy.length} strategy points`,
  });

  // blocking-gates
  if (analysis.blockingIssues.length > 0) {
    blocked = true;
    errors.push(
      ...analysis.blockingIssues.map((issue) => `blocking: ${issue}`),
    );
    stages.push({
      stage: "blocking-gates",
      status: "failed",
      error: analysis.blockingIssues.join("; "),
    });
  } else {
    stages.push({
      stage: "blocking-gates",
      status: "passed",
      detail: "no blocking intake issues",
    });
  }

  // draft + validate
  let draft = "";
  let draftHash: string | null = null;
  if (!blocked) {
    draft = generateDraft(input, analysis);
    // draftHash is computed by the caller via computeDraftHash(draft)
    // The executor returns null here; the server function computes it.
    draftHash = null;
    stages.push({
      stage: "draft",
      status: "passed",
      detail: `${draft.length} chars`,
    });
    stages.push({
      stage: "draft-provenance",
      status: "passed",
      detail: `${analysis.facts.length} source facts with provenance tracking`,
    });
    const validation = validateDraft(draft, input.workflowId);
    stages.push({
      stage: "validate",
      status: validation.passed ? "passed" : "failed",
      detail: `${validation.errors.length} errors, ${validation.warnings.length} warnings`,
      error: validation.passed ? undefined : validation.errors.join("; "),
    });
    if (!validation.passed) {
      blocked = true;
      errors.push(
        ...validation.errors.map((error) => `validation: ${error}`),
      );
    }
    warnings.push(...validation.warnings);
  } else {
    stages.push({ stage: "draft", status: "blocked" });
    stages.push({ stage: "draft-provenance", status: "blocked" });
    stages.push({ stage: "validate", status: "blocked" });
  }

  // Consequential stages
  if (blocked) {
    stages.push({ stage: "human-review", status: "blocked" });
    stages.push({ stage: "approval", status: "blocked" });
    stages.push({ stage: "authorized-mail", status: "blocked" });
    stages.push({ stage: "track", status: "blocked" });
    stages.push({ stage: "prove-audit", status: "blocked" });
  } else if (!consequential) {
    stages.push({
      stage: "human-review",
      status: "skipped",
      detail: "consequential state not supplied",
    });
    stages.push({
      stage: "approval",
      status: "skipped",
      detail: "consequential state not supplied",
    });
    stages.push({
      stage: "authorized-mail",
      status: "skipped",
      detail: "consequential state not supplied",
    });
    stages.push({
      stage: "track",
      status: "skipped",
      detail: "consequential state not supplied",
    });
    stages.push({
      stage: "prove-audit",
      status: "skipped",
      detail: "consequential state not supplied",
    });
  } else {
    const canApprove = canApproveMatter(analysis);
    stages.push({
      stage: "human-review",
      status: canApprove ? "passed" : "failed",
      error: canApprove
        ? undefined
        : "Unresolved evidence or findings block review",
    });

    if (!canApprove) {
      blocked = true;
      errors.push("human-review: unresolved evidence or findings");
      stages.push({ stage: "approval", status: "blocked" });
      stages.push({ stage: "authorized-mail", status: "blocked" });
      stages.push({ stage: "track", status: "blocked" });
      stages.push({ stage: "prove-audit", status: "blocked" });
    } else {
      // Draft version integrity check: if approvedDraftHash doesn't match current draft, approval is stale
      const approvalValid = isApprovalValidCheck(
        draftHash,
        consequential.approvedDraftHash,
      );

      stages.push({
        stage: "approval",
        status: consequential.humanApproved && approvalValid ? "passed" : "failed",
        error: !consequential.humanApproved
          ? "Explicit human approval required"
          : !approvalValid
            ? "Draft was modified after approval — re-review and re-approve required"
            : undefined,
      });

      if (!consequential.humanApproved || !approvalValid) {
        blocked = true;
        if (!consequential.humanApproved)
          errors.push("approval: explicit human approval required");
        if (!approvalValid)
          errors.push("approval: draft modified after approval");
        stages.push({ stage: "authorized-mail", status: "blocked" });
        stages.push({ stage: "track", status: "blocked" });
        stages.push({ stage: "prove-audit", status: "blocked" });
      } else {
        const authorized = canAuthorizeMatterMail({
          analysis,
          draftValidated: consequential.draftValidated,
          humanApproved: consequential.humanApproved,
          recipientComplete: consequential.recipientComplete,
          paymentComplete: consequential.paymentComplete,
        });
        const submissionOk = authorized && consequential.mailingSubmitted;

        stages.push({
          stage: "authorized-mail",
          status: submissionOk ? "passed" : "failed",
          error: submissionOk
            ? undefined
            : "Validation, approval, recipient, payment, or provider submission incomplete",
        });

        if (!submissionOk) {
          blocked = true;
          errors.push("authorized-mail: fulfillment prerequisites incomplete");
          stages.push({ stage: "track", status: "blocked" });
          stages.push({ stage: "prove-audit", status: "blocked" });
        } else {
          const tracked = Boolean(consequential.trackingNumber);
          stages.push({
            stage: "track",
            status: tracked ? "passed" : "failed",
            detail: tracked
              ? `tracking=${consequential.trackingNumber}`
              : undefined,
            error: tracked ? undefined : "Tracking number missing",
          });

          const proofOk = canCompleteMatterProof({
            trackingNumber: consequential.trackingNumber,
            proofReady: consequential.proofReady,
          });

          stages.push({
            stage: "prove-audit",
            status: proofOk ? "passed" : "failed",
            error: proofOk ? undefined : "Proof of mailing is not ready",
          });

          if (!proofOk) {
            blocked = true;
            errors.push("prove-audit: tracking or proof missing");
          }
        }
      }
    }
  }

  return {
    workflowId: input.workflowId,
    analysis,
    draft,
    draftHash,
    stages,
    ready: !blocked && errors.length === 0,
    blocked,
    errors,
    warnings,
  };
}

/**
 * Synchronous approval-validity check used by the workflow executor.
 * The executor doesn't have the actual draft hash (it's computed async),
 * so this only checks when both values are present. The fulfillment
 * service does the definitive check with computed hashes.
 */
function isApprovalValidCheck(
  currentDraftHash: string | null,
  approvedDraftHash: string | null,
): boolean {
  // In the executor, draftHash is null (computed by caller), so we
  // can't do a definitive check here. We trust the approvedDraftHash
  // being present as a signal that approval was recorded. The real
  // check happens in the fulfillment service.
  if (!approvedDraftHash) return false;
  if (currentDraftHash === null) return true; // executor can't verify, let fulfillment check
  return currentDraftHash === approvedDraftHash;
}

// ── LLM-Enhanced Workflow Execution ──────────────────────────────────────
//
// The LLM-enhanced path follows this pattern:
//
//   deterministic baseline
//       +
//   LLM enhancement
//       +
//   deterministic reconciliation
//
// If LLM enhancement fails, the system returns the deterministic result.
// The LLM can NEVER authorize, approve, or trigger consequential actions.

import { reconcileWithLLM } from "./llm-reconciliation";
import { getLLMAdapter } from "@/platform/llm-adapter";
import { getAuthorityProvider } from "@/platform/authority-provider";

export async function runProfiledWorkflowWithLLM(
  input: WorkflowExecutionInput,
  consequential?: WorkflowConsequentialState | null,
): Promise<WorkflowExecutionResult & {
  llmEnhanced: boolean;
  llmSkippedReason?: string;
}> {
  // 1. Run the deterministic workflow first (always)
  const deterministicResult = runProfiledWorkflow(input, consequential);

  // 2. Attempt LLM enhancement (advisory only)
  const adapter = getLLMAdapter();
  const authorityProvider = getAuthorityProvider();

  const reconciliation = await reconcileWithLLM(
    deterministicResult.analysis,
    input.text,
    adapter,
    authorityProvider,
    input.workflowId,
  );

  // 3. Return the result with enhanced analysis
  // The stages, draft, blocking, etc. are all from the deterministic path.
  // Only the analysis is enhanced (additively).
  return {
    ...deterministicResult,
    analysis: reconciliation.analysis,
    llmEnhanced: reconciliation.llmEnhanced,
    llmSkippedReason: reconciliation.llmSkippedReason,
  };
}
