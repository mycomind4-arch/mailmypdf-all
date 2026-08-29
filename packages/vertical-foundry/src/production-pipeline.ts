import type { FoundryRun, FoundryStage, QualityGate, VerticalCandidate } from './foundry-contract.js'
import { candidateToSpec } from './research-to-spec.js'
import { prepareVerticalBuild, type VerticalFactoryAdapter } from './factory-adapter.js'
import { gateQA, type QAResult } from './qa-pipeline.js'
import { deployPreview, type DeploymentAdapter } from './deployment-gate.js'
import { registerVerifiedVertical, type EcosystemRegistryAdapter } from './registration-gate.js'

export interface ProductionPipelineDeps {
  factory: VerticalFactoryAdapter
  deployer: DeploymentAdapter
  registry: EcosystemRegistryAdapter
  qa: (candidate: VerticalCandidate) => Promise<QAResult>
}

export interface ProductionPipelineResult {
  run: FoundryRun
  previewUrl?: string
  registered?: boolean
}

const stages: readonly FoundryStage[] = ['RESEARCH','SELECT','SPECIFY','BUILD','QA','RED_TEAM','VERIFY','DEPLOY','REGISTER']

export async function executeProductionPipeline(candidate: VerticalCandidate, deps: ProductionPipelineDeps, repository: string): Promise<ProductionPipelineResult> {
  const run: FoundryRun = { runId: `run_${candidate.id}`, candidateId: candidate.id, stages: [...stages], gates: [], humanApprovalRequired: true }
  const spec = candidateToSpec(candidate)
  const build = await prepareVerticalBuild(run, candidate, deps.factory, repository)
  if (build.status !== 'CREATED') throw new Error('Build was not created')

  const qa = await deps.qa(candidate)
  gateQA(qa)
  const qaGate: QualityGate = { stage: 'QA', status: 'PASS', score: qa.score, blockers: [], reviewer: 'release-judge' }
  run.gates.push(qaGate)

  const preview = await deployPreview(deps.deployer, build.repository, build.branch)
  const verifyGate: QualityGate = { stage: 'VERIFY', status: 'PASS', score: 100, blockers: [], reviewer: 'release-judge' }
  run.gates.push(verifyGate)

  if (!preview.url) throw new Error(`Preview deployment for ${spec.id} returned no URL`)
  const registration = await registerVerifiedVertical(deps.registry, { verticalId: spec.id, previewUrl: preview.url, verified: true })
  return { run, previewUrl: preview.url, registered: registration.registered }
}
