import type { WorkflowCapability } from "@mailmypdf/workflows";

export const SECURED_TRANSACTION_VERTICAL_ID = "secured-transactions" as const;
export const SECURED_TRANSACTION_PIPELINE_ID = "P11_SECURED_TRANSACTION" as const;
export const SECURED_TRANSACTION_ADAPTER_ID = "secured-transactions" as const;

export const SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES = [
  "identity",
  "matterState",
  "security",
  "classification",
  "extraction",
  "provenance",
  "facts",
  "findings",
  "requirements",
  "evidence",
  "research",
  "risk",
  "strategy",
  "validation",
  "blockingGate",
  "humanReview",
  "approval",
  "proofAudit",
] as const satisfies readonly WorkflowCapability[];
