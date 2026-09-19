import { defineWorkflow } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ADAPTER_ID,
  SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_PIPELINE_ID,
  SECURED_TRANSACTION_VERTICAL_ID,
} from "../../shared/domain/manifest-base";

/**
 * Capability declarations are intentionally workflow-specific.
 *
 * P11 now requires only the stages common to every secured-transaction
 * workflow. Eligibility therefore declares the narrower capability set it
 * actually exercises instead of inheriting the entire secured-transaction
 * family bundle.
 */
export const workflowManifest = defineWorkflow({
  id: "secured-transaction-eligibility",
  vertical: SECURED_TRANSACTION_VERTICAL_ID,
  title: "Secured-Transaction Eligibility",
  route: "/secured-transactions/workflows/secured-transaction-eligibility/start",
  pipeline: SECURED_TRANSACTION_PIPELINE_ID,
  adapters: [SECURED_TRANSACTION_ADAPTER_ID],
  requiredCapabilities: [...SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES],
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
