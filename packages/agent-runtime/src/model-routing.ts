export type RoutedModelClass = 'FAST' | 'REASONING' | 'VISION' | 'CODE' | 'MULTILINGUAL' | 'EMBEDDING'

export interface ModelProvider { id: string; classes: RoutedModelClass[]; healthy: boolean; priority?: number }
export interface ModelRoutePolicy { allowedProviders?: string[]; requiredClass: RoutedModelClass; requireHealthy?: boolean }

export function routeModel(providers: readonly ModelProvider[], policy: ModelRoutePolicy): ModelProvider {
  const candidates = providers.filter(p => p.classes.includes(policy.requiredClass) && (!policy.requireHealthy || p.healthy) && (!policy.allowedProviders || policy.allowedProviders.includes(p.id)))
  if (!candidates.length) throw new Error(`No model provider satisfies ${policy.requiredClass}`)
  return [...candidates].sort((a,b) => (a.priority ?? 0) - (b.priority ?? 0))[0]
}
