import { defineWorkflow } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ADAPTER_ID,
  SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_PIPELINE_ID,
  SECURED_TRANSACTION_VERTICAL_ID,
} from "../../shared/domain/manifest-base";

/**
 * This workflow deliberately declares only the shared capabilities its current
 * implementation exercises. P11 treats the rest of the secured-transaction
 * lifecycle as composable/optional so workflow manifests remain truthful.
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
