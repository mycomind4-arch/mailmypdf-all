import { defineWorkflow } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ADAPTER_ID,
  SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_PIPELINE_ID,
  SECURED_TRANSACTION_VERTICAL_ID,
} from "../../shared/domain/manifest-base";

export const workflowManifest = defineWorkflow({
  id: "amendment-continuation-assignment-termination",
  vertical: SECURED_TRANSACTION_VERTICAL_ID,
  title: "Amendment / Continuation / Assignment / Termination",
  route: "/secured-transactions/workflows/amendment-continuation-assignment-termination/start",
  pipeline: SECURED_TRANSACTION_PIPELINE_ID,
  adapters: [SECURED_TRANSACTION_ADAPTER_ID],
  requiredCapabilities: [...SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES],
  optionalCapabilities: [],
  notApplicableCapabilities: [],
  maturity: "placeholder",
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
