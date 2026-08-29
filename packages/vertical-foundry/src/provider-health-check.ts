/**
 * Provider Health Check — verifies all providers are healthy before
 * the pipeline runs. Catches dead credentials, revoked tokens, and
 * unreachable endpoints before they cause mid-pipeline failures.
 */

import type { ProviderSet, RepositoryProvider, ModelProvider, DeploymentProvider, RegistryProvider } from './provider-contracts.js'

export interface HealthCheckResult {
  provider: string
  healthy: boolean
  latencyMs: number
  error?: string
  details?: unknown
  checkedAt: string
}

export interface PipelineHealthReport {
  allHealthy: boolean
  results: HealthCheckResult[]
  checkedAt: string
}

async function checkOne(
  name: string,
  fn: () => Promise<{ healthy: boolean; models?: string[] }>,
): Promise<HealthCheckResult> {
  const start = Date.now()
  const checkedAt = new Date().toISOString()
  try {
    const result = await fn()
    return {
      provider: name,
      healthy: result.healthy,
      latencyMs: Date.now() - start,
      details: 'models' in result ? { models: result.models } : undefined,
      checkedAt,
    }
  } catch (error) {
    return {
      provider: name,
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      checkedAt,
    }
  }
}

export async function checkProviderHealth(
  providers: {
    repository?: RepositoryProvider
    model?: ModelProvider
    deployment?: DeploymentProvider
    registry?: RegistryProvider
  },
): Promise<PipelineHealthReport> {
  const checks: Promise<HealthCheckResult>[] = []
  const checkedAt = new Date().toISOString()

  if (providers.repository) {
    checks.push(checkOne('repository', () => providers.repository!.healthCheck()))
  }
  if (providers.model) {
    checks.push(checkOne('model', () => providers.model!.healthCheck()))
  }
  if (providers.deployment) {
    checks.push(checkOne('deployment', () => providers.deployment!.healthCheck()))
  }
  if (providers.registry) {
    checks.push(checkOne('registry', () => providers.registry!.healthCheck()))
  }

  const results = await Promise.all(checks)

  return {
    allHealthy: results.length > 0 && results.every((r) => r.healthy),
    results,
    checkedAt,
  }
}

export async function checkProviderSet(set: ProviderSet): Promise<PipelineHealthReport> {
  return checkProviderHealth(set)
}
