import { defineWorkflow } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ADAPTER_ID,
  SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_PIPELINE_ID,
  SECURED_TRANSACTION_VERTICAL_ID,
} from "../../shared/domain/manifest-base";

export const workflowManifest = defineWorkflow({
  id: "name-capacity-resolution",
  vertical: SECURED_TRANSACTION_VERTICAL_ID,
  title: "Name & Capacity Resolution",
  route: "/secured-transactions/workflows/name-capacity-resolution/start",
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
    { id: "material-sources-reviewed", kind: "evidence_ready", label: "Material source records have been reviewed", required: true },
    { id: "identity-capacity-review", kind: "human_review", label: "Material identity and capacity findings have been reviewed", required: true },
  ],
  acceptanceScenarios: [
    { id: "capitalization-does-not-create-person", description: "Capitalization differences alone do not create a separate identity finding.", required: true },
    { id: "conflict-remains-unresolved", description: "Contradictory authoritative records remain explicit until reviewed.", required: true },
  ],
});

export default workflowManifest;
