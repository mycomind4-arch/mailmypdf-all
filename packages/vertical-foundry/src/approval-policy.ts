import type { FoundryStage } from './foundry-contract.js'

export interface ApprovalPolicy { requireHumanFor: readonly FoundryStage[]; allowDryRun: boolean }
export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = { requireHumanFor: ['DEPLOY','REGISTER'], allowDryRun: true }

export function requiresApproval(policy: ApprovalPolicy, stage: FoundryStage): boolean { return policy.requireHumanFor.includes(stage) }
export function assertDryRunAllowed(policy: ApprovalPolicy, dryRun: boolean): void {
  if (dryRun && !policy.allowDryRun) throw new Error('Dry-run execution is disabled by policy')
}
