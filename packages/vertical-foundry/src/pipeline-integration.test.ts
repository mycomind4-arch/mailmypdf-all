import assert from 'node:assert/strict'
import test from 'node:test'
import {
  StubFactoryAdapter,
  StubDeploymentProvider,
  InMemoryRegistryProvider,
  CloudflareDeploymentBridge,
  EcosystemRegistryBridge,
  runFullPipeline,
  type VerticalCandidate,
} from './index.js'

function makeCandidate(): VerticalCandidate {
  return {
    id: 'e2e-test-001',
    name: 'E2E Test Vertical',
    description: 'End-to-end pipeline test vertical',
    findings: [
      { source: 'market-research', claim: 'High demand detected', confidence: 0.9, capturedAt: new Date().toISOString() },
      { source: 'competition', claim: 'Low competition', confidence: 0.8, capturedAt: new Date().toISOString() },
    ],
    score: { demand: 85, competition: 75, differentiation: 80, reuse: 90, feasibility: 85, risk: 15, overall: 82 },
  }
}

test('full pipeline with stub providers completes all 6 gates', async () => {
  const result = await runFullPipeline(makeCandidate(), {
    factory: new StubFactoryAdapter(),
    deployment: new CloudflareDeploymentBridge(new StubDeploymentProvider()),
    registry: new EcosystemRegistryBridge(new InMemoryRegistryProvider()),
    framework: 'static' as const,
    domainTemplate: (id) => `${id}.vertical.example.com`,
    repository: 'org/test-vertical-repo',
    createPR: false,
  })

  assert.equal(result.allGatesPassed, true)
  assert.equal(result.registered, true)
  assert.equal(result.deploymentStatus, 'PREVIEW')
  assert.ok(result.deploymentUrl.includes('preview.pages.dev'))
  assert.equal(result.gateSummary.length, 6)

  const gateNames = result.gateSummary.map((g) => g.gate)
  assert.deepEqual(gateNames, ['research', 'specification', 'implementation', 'qa', 'deployment', 'registration'])

  assert.ok(result.gateSummary.every((g) => g.status === 'passed'))
  assert.ok(result.gateSummary.every((g) => g.durationMs !== undefined && g.durationMs >= 0))
})

test('full pipeline manifest contains all lifecycle data', async () => {
  const result = await runFullPipeline(makeCandidate(), {
    factory: new StubFactoryAdapter(),
    deployment: new CloudflareDeploymentBridge(new StubDeploymentProvider()),
    registry: new EcosystemRegistryBridge(new InMemoryRegistryProvider()),
    framework: 'static' as const,
    domainTemplate: (id) => `${id}.vertical.example.com`,
    repository: 'org/test-vertical-repo',
    createPR: false,
  })

  const m = result.manifest
  assert.equal(m.id, 'e2e-test-001')
  assert.equal(m.repository, 'org/test-vertical-repo')
  assert.ok(m.branch.startsWith('foundry/'))
  assert.ok(m.domain.includes('vertical.example.com'))
  assert.ok(m.previewUrl)
  assert.ok(m.registrationId)
  assert.ok(m.gateHistory && m.gateHistory.length >= 6)
  assert.ok(m.buildConfig)
  assert.equal(m.buildConfig!.framework, 'static')
})

test('full pipeline rejects candidate with no research findings', async () => {
  const emptyCandidate: VerticalCandidate = {
    ...makeCandidate(),
    findings: [],
  }

  await assert.rejects(
    () => runFullPipeline(emptyCandidate, {
      factory: new StubFactoryAdapter(),
      deployment: new CloudflareDeploymentBridge(new StubDeploymentProvider()),
      registry: new EcosystemRegistryBridge(new InMemoryRegistryProvider()),
      framework: 'static' as const,
      domainTemplate: (id) => `${id}.vertical.example.com`,
      repository: 'org/test-vertical-repo',
      createPR: false,
    }),
    /no findings/i,
  )
})

test('full pipeline produces different domains for different candidates', async () => {
  const candidate1 = { ...makeCandidate(), id: 'vertical-a' }
  const candidate2 = { ...makeCandidate(), id: 'vertical-b' }

  const config = {
    factory: new StubFactoryAdapter(),
    deployment: new CloudflareDeploymentBridge(new StubDeploymentProvider()),
    registry: new EcosystemRegistryBridge(new InMemoryRegistryProvider()),
    framework: 'static' as const,
    domainTemplate: (id: string) => `${id}.vertical.example.com`,
    repository: 'org/test-vertical-repo',
    createPR: false,
  }

  const [result1, result2] = await Promise.all([
    runFullPipeline(candidate1, config),
    runFullPipeline(candidate2, config),
  ])

  assert.notEqual(result1.manifest.domain, result2.manifest.domain)
  assert.ok(result1.manifest.domain.includes('vertical-a'))
  assert.ok(result2.manifest.domain.includes('vertical-b'))
})

test('full pipeline gate history shows passed status for all gates', async () => {
  const result = await runFullPipeline(makeCandidate(), {
    factory: new StubFactoryAdapter(),
    deployment: new CloudflareDeploymentBridge(new StubDeploymentProvider()),
    registry: new EcosystemRegistryBridge(new InMemoryRegistryProvider()),
    framework: 'static' as const,
    domainTemplate: (id) => `${id}.vertical.example.com`,
    repository: 'org/test-vertical-repo',
    createPR: false,
  })

  const history = result.manifest.gateHistory ?? []
  const gateStatuses = new Map(history.map((g) => [g.gate, g.status]))

  assert.equal(gateStatuses.get('research'), 'passed')
  assert.equal(gateStatuses.get('specification'), 'passed')
  assert.equal(gateStatuses.get('implementation'), 'passed')
  assert.equal(gateStatuses.get('qa'), 'passed')
  assert.equal(gateStatuses.get('deployment'), 'passed')
  assert.equal(gateStatuses.get('registration'), 'passed')
})
