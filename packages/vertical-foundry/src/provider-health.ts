export interface ProviderHealth { name: string; healthy: boolean; checkedAt: string; detail?: string }
export interface ProviderHealthCheck { check(): Promise<ProviderHealth> }

export async function requireHealthy(check: ProviderHealthCheck): Promise<ProviderHealth> {
  const health = await check.check()
  if (!health.healthy) throw new Error(`Provider unhealthy: ${health.name}`)
  return health
}
