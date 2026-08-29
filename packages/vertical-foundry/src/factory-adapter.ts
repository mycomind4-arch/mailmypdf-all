import type { FoundryRun, VerticalCandidate } from './foundry-contract.js'

export interface VerticalBuildRequest { candidate: VerticalCandidate; repository: string; branch: string }
export interface VerticalBuildResult { repository: string; branch: string; status: 'PLANNED' | 'CREATED' }

/** Adapter boundary: the Foundry can request a build without owning GitHub credentials or repository mutation policy. */
export interface VerticalFactoryAdapter {
  createBuild(request: VerticalBuildRequest): Promise<VerticalBuildResult>
}

export async function prepareVerticalBuild(run: FoundryRun, candidate: VerticalCandidate, adapter: VerticalFactoryAdapter, repository: string): Promise<VerticalBuildResult> {
  if (run.candidateId !== candidate.id) throw new Error('Foundry run and candidate do not match')
  return adapter.createBuild({ candidate, repository, branch: `foundry/${candidate.id}` })
}
