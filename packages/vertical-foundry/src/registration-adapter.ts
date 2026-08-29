import type { FoundryRun } from './foundry-contract.js'
import type { OrchestratorState } from './orchestrator.js'

export interface EcosystemRegistrationRequest { verticalId: string; repository: string; productionUrl?: string; previewUrl?: string; capabilities: string[]; theme: string }

export function prepareRegistration(run: FoundryRun, state: OrchestratorState, request: EcosystemRegistrationRequest): EcosystemRegistrationRequest | null {
  if (state.status !== 'COMPLETE' || run.candidateId !== request.verticalId) return null
  return request
}
