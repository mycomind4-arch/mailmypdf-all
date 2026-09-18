import type { WorkflowCapability } from "@mailmypdf/workflows";

export const SECURED_TRANSACTION_VERTICAL_ID = "secured-transactions" as const;
export const SECURED_TRANSACTION_PIPELINE_ID = "P11_SECURED_TRANSACTION" as const;
export const SECURED_TRANSACTION_ADAPTER_ID = "secured-transactions" as const;

function dedupeCapabilities(
  groups: readonly (readonly WorkflowCapability[])[],
): readonly WorkflowCapability[] {
  return [...new Set(groups.flat())];
}

/**
 * Composable secured-transaction capability groups.
 *
 * Each constant names real @mailmypdf/workflows CapabilityId values only
 * (see packages/workflows/src/capability-registry.ts) -- never an invented
 * id. Groups are intentionally granular (mostly one real capability each)
 * so a workflow can compose exactly what it exercises instead of inheriting
 * an all-or-nothing list. SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES
 * below is the union of every group, in the same effective set as the
 * previous flat array, so the 16 workflows still importing it keep an
 * unchanged effective capability list.
 */
export const SECURED_TRANSACTION_IDENTITY_CAPABILITIES = ["identity"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_SECURITY_CAPABILITIES = ["security"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_MATTER_STATE_CAPABILITIES = ["matterState"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_DOCUMENT_CAPABILITIES = ["classification", "extraction"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_FACTS_CAPABILITIES = ["facts"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_EVIDENCE_CAPABILITIES = ["evidence"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_PROVENANCE_CAPABILITIES = ["provenance"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_FINDINGS_CAPABILITIES = ["findings", "requirements"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_VALIDATION_CAPABILITIES = ["validation", "blockingGate"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_HUMAN_REVIEW_CAPABILITIES = ["humanReview"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_APPROVAL_CAPABILITIES = ["approval"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_RESEARCH_CAPABILITIES = ["research", "risk", "strategy"] as const satisfies readonly WorkflowCapability[];
export const SECURED_TRANSACTION_AUDIT_CAPABILITIES = ["proofAudit"] as const satisfies readonly WorkflowCapability[];

const ALL_SECURED_TRANSACTION_CAPABILITY_GROUPS = [
  SECURED_TRANSACTION_IDENTITY_CAPABILITIES,
  SECURED_TRANSACTION_SECURITY_CAPABILITIES,
  SECURED_TRANSACTION_MATTER_STATE_CAPABILITIES,
  SECURED_TRANSACTION_DOCUMENT_CAPABILITIES,
  SECURED_TRANSACTION_FACTS_CAPABILITIES,
  SECURED_TRANSACTION_EVIDENCE_CAPABILITIES,
  SECURED_TRANSACTION_PROVENANCE_CAPABILITIES,
  SECURED_TRANSACTION_FINDINGS_CAPABILITIES,
  SECURED_TRANSACTION_VALIDATION_CAPABILITIES,
  SECURED_TRANSACTION_HUMAN_REVIEW_CAPABILITIES,
  SECURED_TRANSACTION_APPROVAL_CAPABILITIES,
  SECURED_TRANSACTION_RESEARCH_CAPABILITIES,
  SECURED_TRANSACTION_AUDIT_CAPABILITIES,
] as const;

/**
 * Backwards-compatible aggregate: the union of every capability group,
 * deterministic and deduplicated. This is the same effective capability
 * set the previous flat array declared. Workflows that have not yet been
 * audited for a truthful, narrower declaration keep importing this
 * unchanged; do not add new capabilities to it without also adding a real,
 * exercised implementation.
 */
export const SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES = dedupeCapabilities(
  ALL_SECURED_TRANSACTION_CAPABILITY_GROUPS,
);

export interface SecuredTransactionCapabilitySelection {
  identity?: boolean;
  security?: boolean;
  matterState?: boolean;
  documents?: boolean;
  facts?: boolean;
  evidence?: boolean;
  provenance?: boolean;
  findings?: boolean;
  validation?: boolean;
  humanReview?: boolean;
  approval?: boolean;
  research?: boolean;
  audit?: boolean;
}

/**
 * Composes only the capability groups a workflow actually selects.
 * Deterministic, type-safe, deduplicated, and restricted to real
 * CapabilityId values -- never invents a capability outside the groups
 * above.
 */
export function securedTransactionCapabilities(
  selection: SecuredTransactionCapabilitySelection,
): readonly WorkflowCapability[] {
  const groups: (readonly WorkflowCapability[])[] = [];
  if (selection.identity) groups.push(SECURED_TRANSACTION_IDENTITY_CAPABILITIES);
  if (selection.security) groups.push(SECURED_TRANSACTION_SECURITY_CAPABILITIES);
  if (selection.matterState) groups.push(SECURED_TRANSACTION_MATTER_STATE_CAPABILITIES);
  if (selection.documents) groups.push(SECURED_TRANSACTION_DOCUMENT_CAPABILITIES);
  if (selection.facts) groups.push(SECURED_TRANSACTION_FACTS_CAPABILITIES);
  if (selection.evidence) groups.push(SECURED_TRANSACTION_EVIDENCE_CAPABILITIES);
  if (selection.provenance) groups.push(SECURED_TRANSACTION_PROVENANCE_CAPABILITIES);
  if (selection.findings) groups.push(SECURED_TRANSACTION_FINDINGS_CAPABILITIES);
  if (selection.validation) groups.push(SECURED_TRANSACTION_VALIDATION_CAPABILITIES);
  if (selection.humanReview) groups.push(SECURED_TRANSACTION_HUMAN_REVIEW_CAPABILITIES);
  if (selection.approval) groups.push(SECURED_TRANSACTION_APPROVAL_CAPABILITIES);
  if (selection.research) groups.push(SECURED_TRANSACTION_RESEARCH_CAPABILITIES);
  if (selection.audit) groups.push(SECURED_TRANSACTION_AUDIT_CAPABILITIES);
  return dedupeCapabilities(groups);
}

/**
 * secured-transaction-eligibility's truthful, minimal capability set.
 *
 * matterState: real, persisted via @mailmypdf/step-workflow.
 * findings: real, the engine's per-gate findings are persisted.
 * validation: real, runtime input validation + the engine's fail-closed gates.
 * humanReview: real, human-review-required state is persisted and surfaced.
 *
 * Deliberately NOT claimed: identity (no live authenticated session resolves
 * ownerId yet), evidence/provenance (only plain structured source
 * references are recorded, not a stronger provenance/chain-of-custody
 * facility), security/documents/facts/approval/research/audit (not
 * exercised by this workflow at all).
 */
export const SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES = securedTransactionCapabilities({
  matterState: true,
  findings: true,
  validation: true,
  humanReview: true,
});
