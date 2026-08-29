import type { VerticalSpec } from './research-to-spec.js'
import type { VerticalFactoryAdapter, VerticalBuildResult } from './factory-adapter.js'

export interface BuildPipelineResult { build: VerticalBuildResult; spec: VerticalSpec }

export async function runBuildPipeline(spec: VerticalSpec, factory: VerticalFactoryAdapter, repository: string): Promise<BuildPipelineResult> {
  const candidate = { id: spec.id, name: spec.name, description: spec.description } as any
  const build = await factory.createBuild({ candidate, repository, branch: `foundry/${spec.id}` })
  return { build, spec }
}
