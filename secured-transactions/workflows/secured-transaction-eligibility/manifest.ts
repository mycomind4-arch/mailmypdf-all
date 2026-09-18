import { defineWorkflow } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ADAPTER_ID,
  SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_PIPELINE_ID,
  SECURED_TRANSACTION_VERTICAL_ID,
} from "../../shared/domain/manifest-base";

/**
 * NOTE ON CAPABILITY TRUTHFULNESS:
 *
 * This workflow's implementation only genuinely exercises matterState,
 * findings, validation, and humanReview (see
 * SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES in
 * ../../shared/domain/manifest-base.ts for the truthful set and why each
 * other capability is excluded).
 *
 * It cannot be declared here: @mailmypdf/workflows' defineWorkflow()
 * validates every workflow against its pipeline's full requiredStages list
 * (packages/workflows/src/pipeline-registry.ts, P11_SECURED_TRANSACTION),
 * which hardcodes security, classification, extraction, provenance,
 * findings, requirements, evidence, research, risk, strategy, validation,
 * blockingGate, review, approval, proofAudit -- regardless of what any
 * individual workflow on that pipeline actually does. Declaring a narrower
 * list throws PIPELINE_CAPABILITY_UNDECLARED at workflow definition time.
 * That is genuinely shared, cross-cutting infrastructure (not this
 * section's manifest-base.ts), so this task leaves it untouched rather
 * than editing it unilaterally. See the final report's SHARED MANIFEST
 * CAPABILITY FIX section.
 */
export const workflowManifest = defineWorkflow({
  id: "secured-transaction-eligibility",
  vertical: SECURED_TRANSACTION_VERTICAL_ID,
  title: "Secured-Transaction Eligibility",
  route: "/secured-transactions/workflows/secured-transaction-eligibility/start",
  pipeline: SECURED_TRANSACTION_PIPELINE_ID,
  adapters: [SECURED_TRANSACTION_ADAPTER_ID],
  requiredCapabilities: [...SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES],
  optionalCapabilities: [],
  notApplicableCapabilities: [],
  maturity: "wired",
  primaryInput: "case",
  requiresHumanReview: true,
  allowsConsequentialAction: false,
  version: 1,
  gates: [
    { id: "supported-basis", kind: "custom", label: "Workflow-specific required basis is supported by evidence and implemented rules", required: true },
    { id: "human-review", kind: "human_review", label: "Material findings and the exact proposed output have been reviewed", required: true },
  ],
  acceptanceScenarios: [
    { id: "missing-basis-blocks", description: "A missing material fact or authorization basis prevents progression.", required: true },
    { id: "conflict-remains-visible", description: "Contradictory material evidence remains explicit until reviewed.", required: true },
  ],
});

export default workflowManifest;
