export interface ProviderPolicy { allowRepositoryMutation: boolean; allowPreviewDeployment: boolean; allowRegistration: boolean }

export function assertProviderPolicy(policy: ProviderPolicy): void {
  if (!policy.allowRepositoryMutation) throw new Error('Repository mutation is not authorized')
  if (!policy.allowPreviewDeployment) throw new Error('Preview deployment is not authorized')
  if (!policy.allowRegistration) throw new Error('Ecosystem registration is not authorized')
}
