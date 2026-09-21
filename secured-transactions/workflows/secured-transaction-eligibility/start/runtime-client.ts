/**
 * `executable` here means only: this client adapter (intake logic, runtime
 * validation, the matter-persistence adapter, and their tests) has real,
 * non-stub implementation code. It is a narrower claim than "production
 * launchable" -- traced against every consumer in this repository, nothing
 * reads this field; the workflow catalog's actual live/discoverable gate is
 * `manifest.maturity` (see packages/workflows/src/workflow-registry.ts's
 * executable() filter), which this workflow does not set to "executable".
 * The top-level mailmypdf TanStack host mounts this intake behind auth.
 * Account-backed saving and document review are not wired. Draft download/
 * reopen is local-file persistence only, not a server matter or evidence review.
 */
export const workflowRuntimeClient = {
  workflowId: "secured-transaction-eligibility",
  verticalId: "secured-transactions",
  executable: true,
  reason: "The authenticated top-level host provides a six-section guided intake, open-question review, and validated local draft download/reopen. User reports never verify a gate. The shared eligibility engine and separate owner-scoped matter adapter remain available; the UI is not connected to account persistence, document verification, or automatic workflow-2 handoff. No filing, payment, mailing, or legal eligibility conclusion is produced.",
} as const;

export default workflowRuntimeClient;
