export type ProviderCapability = 'REPOSITORY_WRITE' | 'MODEL_EXECUTION' | 'PREVIEW_DEPLOY' | 'REGISTRY_WRITE'
export interface ProviderScope { provider: string; capabilities: ProviderCapability[]; expiresAt?: string }

export function allows(scope: ProviderScope, capability: ProviderCapability): boolean {
  if (scope.expiresAt && Date.parse(scope.expiresAt) <= Date.now()) return false
  return scope.capabilities.includes(capability)
}
