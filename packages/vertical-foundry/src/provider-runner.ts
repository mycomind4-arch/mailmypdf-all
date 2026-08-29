import type { ProviderSet } from './provider-contracts.js'
import type { VerticalSpec } from './research-to-spec.js'

export interface ProviderRunResult { branch: string; previewUrl: string; registered: boolean }

export async function runProviderPipeline(providers: ProviderSet, spec: VerticalSpec, repository: string): Promise<ProviderRunResult> {
  const branch = `foundry/${spec.id}`
  await providers.repository.createBranch(repository, branch)
  const preview = await providers.deployment.preview(repository, branch)
  const registration = await providers.registry.register({ verticalId: spec.id, previewUrl: preview.url })
  return { branch, previewUrl: preview.url, registered: registration.registered }
}
