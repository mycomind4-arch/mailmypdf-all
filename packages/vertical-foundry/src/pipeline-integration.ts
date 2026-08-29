/**
 * Pipeline Integration — end-to-end test harness and result aggregator.
 *
 * Wires all provider bridges together through the full Foundry lifecycle:
 * research → specify → build → QA → deploy → register
 *
 * Uses stub providers by default for safe CI execution.
 * Real providers can be injected for live integration testing.
 */

import type { VerticalCandidate } from './foundry-contract.js'
import type { VerticalManifest, GateName } from './vertical-manifest.js'
import { createManifest, validateManifest, startGate, completeGate, allGatesPassed } from './vertical-manifest.js'
import type { VerticalFactoryAdapter, VerticalBuildResult } from './factory-adapter.js'
import type { DeploymentAdapter } from './deployment-gate.js'
import type { EcosystemRegistryAdapter } from './registration-gate.js'
import { generateVerticalCode } from './vertical-code-generator.js'

export interface PipelineConfig {
  factory: VerticalFactoryAdapter
  deployment: DeploymentAdapter
  registry: EcosystemRegistryAdapter
  framework: 'next' | 'astro' | 'vite' | 'static'
  domainTemplate: (id: string) => string
  repository: string
  createPR: boolean
}

export interface GateSummaryEntry {
  gate: GateName
  status: string
  durationMs?: number
}

export interface PipelineResult {
  manifest: VerticalManifest
  buildResult: VerticalBuildResult
  deploymentUrl: string
  deploymentStatus: 'PREVIEW' | 'PRODUCTION'
  registered: boolean
  allGatesPassed: boolean
  gateSummary: GateSummaryEntry[]
}

export async function runFullPipeline(
  candidate: VerticalCandidate,
  config: PipelineConfig,
): Promise<PipelineResult> {
  let manifest = createManifest({
    id: candidate.id,
    name: candidate.name,
    domain: config.domainTemplate(candidate.id),
    repository: config.repository,
    branch: `foundry/${candidate.id}`,
    capabilities: candidate.findings.map((f) => f.source),
    excludedRepositories: ['mycomind4-arch/mailmypdf'],
  })

  const gateTimings: Array<{ gate: GateName; start: number; end?: number }> = []
  const timedGate = async <T>(gate: GateName, fn: () => Promise<T>): Promise<T> => {
    manifest = startGate(manifest, gate)
    const start = Date.now()
    try {
      const result = await fn()
      const end = Date.now()
      manifest = completeGate(manifest, gate, 'passed', undefined)
      gateTimings.push({ gate, start, end })
      return result
    } catch (error) {
      const end = Date.now()
      manifest = completeGate(manifest, gate, 'failed', error instanceof Error ? error.message : String(error))
      gateTimings.push({ gate, start, end })
      throw error
    }
  }

  // Gate 1: Research (already done — candidate provided)
  await timedGate('research', async () => {
    if (!candidate.findings.length) throw new Error('Research produced no findings')
    return true
  })

  // Gate 2: Specification (generate code plan)
  const codeGen = await timedGate('specification', async () => {
    return generateVerticalCode({ candidate, framework: config.framework, domain: manifest.domain })
  })

  // Attach build config to manifest
  manifest = { ...manifest, buildConfig: codeGen.buildConfig }

  // Gate 3: Implementation (create build in repository)
  const buildResult = await timedGate('implementation', async () => {
    return config.factory.createBuild({
      candidate,
      repository: config.repository,
      branch: manifest.branch,
    })
  })

  // Gate 4: QA (verify build was created)
  await timedGate('qa', async () => {
    if (buildResult.status !== 'CREATED' && buildResult.status !== 'PLANNED') {
      throw new Error(`Build failed: ${buildResult.status}`)
    }
    return true
  })

  // Gate 5: Deployment (preview deployment)
  const deployResult = await timedGate('deployment', async () => {
    return config.deployment.deploy({
      repository: config.repository,
      branch: manifest.branch,
      preview: true,
    })
  })

  manifest = { ...manifest, previewUrl: deployResult.url }

  // Gate 6: Registration (ecosystem registration)
  const regResult = await timedGate('registration', async () => {
    return config.registry.register({
      verticalId: candidate.id,
      previewUrl: deployResult.url,
      verified: true,
    })
  })

  manifest = { ...manifest, registrationId: regResult.verticalId }

  // Finalize manifest
  validateManifest(manifest)

  const gateSummary: GateSummaryEntry[] = gateTimings.map((t) => {
    const entry: GateSummaryEntry = { gate: t.gate, status: 'passed' }
    if (t.end !== undefined) entry.durationMs = t.end - t.start
    return entry
  })

  return {
    manifest,
    buildResult,
    deploymentUrl: deployResult.url,
    deploymentStatus: deployResult.status,
    registered: regResult.registered,
    allGatesPassed: allGatesPassed(manifest),
    gateSummary,
  }
}
