export interface PortfolioPolicy { maxActiveBuilds: number; maxVerticalsPerDay: number; requireUniqueDomain: boolean }
export interface PortfolioState { activeBuilds: number; launchedToday: number; domains: string[] }

export function canStartBuild(policy: PortfolioPolicy, state: PortfolioState, domain: string): boolean {
  if (state.activeBuilds >= policy.maxActiveBuilds) return false
  if (state.launchedToday >= policy.maxVerticalsPerDay) return false
  if (policy.requireUniqueDomain && state.domains.includes(domain)) return false
  return true
}
