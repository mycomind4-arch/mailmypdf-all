export interface CostEstimate { modelUsd: number; buildUsd: number; deploymentUsd: number }
export interface CostPolicy { maxUsd: number }

export function requireWithinBudget(estimate: CostEstimate, policy: CostPolicy): void {
  const total = estimate.modelUsd + estimate.buildUsd + estimate.deploymentUsd
  if (total > policy.maxUsd) throw new Error(`Foundry budget exceeded: $${total.toFixed(2)}`)
}
