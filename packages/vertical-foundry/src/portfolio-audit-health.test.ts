import assert from 'node:assert/strict'
import test from 'node:test'
import {
  StubModelProvider,
  StubDeploymentProvider,
  InMemoryRegistryProvider,
  checkProviderHealth,
  PipelineAuditTrail,
  VerticalPortfolio,
  type VerticalManifest,
} from './index.js'

// ── Health Check Tests ───────────────────────────────────────────────────────

test('health check returns all healthy when all providers are stubs', async () => {
  const report = await checkProviderHealth({
    model: new StubModelProvider(),
    deployment: new StubDeploymentProvider(),
    registry: new InMemoryRegistryProvider(),
  })
  assert.equal(report.allHealthy, true)
  assert.equal(report.results.length, 3)
  assert.ok(report.results.every((r) => r.healthy))
  assert.ok(report.results.every((r) => r.latencyMs >= 0))
})

test('health check handles empty providers', async () => {
  const report = await checkProviderHealth({})
  assert.equal(report.allHealthy, false)
  assert.equal(report.results.length, 0)
})

test('health check reports individual provider names', async () => {
  const report = await checkProviderHealth({
    model: new StubModelProvider(),
    registry: new InMemoryRegistryProvider(),
  })
  const names = report.results.map((r) => r.provider)
  assert.ok(names.includes('model'))
  assert.ok(names.includes('registry'))
  assert.equal(names.length, 2)
})

// ── Audit Trail Tests ────────────────────────────────────────────────────────

test('audit trail records gate events', () => {
  const trail = new PipelineAuditTrail('run-001')
  trail.recordPipelineStart('vert-001', 'Test Vertical')
  trail.recordGateStart('research')
  trail.recordGatePass('research', 100, 'Found 3 opportunities')
  trail.recordGateStart('specification')
  trail.recordGateFail('specification', 'Code gen failed', 200)
  trail.recordPipelineCompleted(false)

  const all = trail.getAll()
  assert.equal(all.length, 6)
  assert.equal(all[0]!.eventType, 'pipeline_started')
  assert.equal(all[1]!.eventType, 'gate_started')
  assert.equal(all[2]!.eventType, 'gate_passed')
  assert.equal(all[3]!.eventType, 'gate_started')
  assert.equal(all[4]!.eventType, 'gate_failed')
  assert.equal(all[5]!.eventType, 'pipeline_failed')
})

test('audit trail getSummary aggregates correctly', () => {
  const trail = new PipelineAuditTrail('run-002')
  trail.recordGateStart('research')
  trail.recordGatePass('research', 50)
  trail.recordGateStart('implementation')
  trail.recordGatePass('implementation', 150)
  trail.recordGateStart('qa')
  trail.recordGateFail('qa', 'Test failure', 100)
  trail.recordProviderCall('github', 'createBranch', 80)
  trail.recordProviderError('cloudflare', 'preview', 'Auth failed', 30)
  trail.recordArtifact('site-preview', 'https://preview.pages.dev')
  trail.recordPipelineCompleted(false)

  const summary = trail.getSummary()
  assert.equal(summary.total, 10)
  assert.equal(summary.gatesPassed, 2)
  assert.equal(summary.gatesFailed, 1)
  assert.equal(summary.providerCalls, 1)
  assert.equal(summary.providerErrors, 1)
  assert.equal(summary.artifactsCreated, 1)
  assert.equal(summary.pipelineStatus, 'failed')
})

test('audit trail filters by gate and provider', () => {
  const trail = new PipelineAuditTrail('run-003')
  trail.recordGateStart('research')
  trail.recordGatePass('research', 50)
  trail.recordGateStart('qa')
  trail.recordGateFail('qa', 'Failed', 100)
  trail.recordProviderCall('github', 'createBranch', 80)
  trail.recordProviderCall('cloudflare', 'preview', 90)

  assert.equal(trail.getByGate('research').length, 2)
  assert.equal(trail.getByGate('qa').length, 2)
  assert.equal(trail.getByProvider('github').length, 1)
  assert.equal(trail.getByProvider('cloudflare').length, 1)
})

test('audit trail export produces valid JSON', () => {
  const trail = new PipelineAuditTrail('run-004')
  trail.recordGateStart('research')
  trail.recordGatePass('research', 50)
  const exported = trail.export()
  const parsed = JSON.parse(exported)
  assert.ok(Array.isArray(parsed))
  assert.equal(parsed.length, 2)
  assert.ok(parsed[0].id)
  assert.ok(parsed[0].runId === 'run-004')
  assert.ok(parsed[0].timestamp)
})

// ── Portfolio Manager Tests ──────────────────────────────────────────────────

function makeManifest(id: string, domain: string): VerticalManifest {
  return {
    id,
    name: `Vertical ${id}`,
    domain,
    repository: 'org/test-repo',
    branch: `foundry/${id}`,
    capabilities: ['search', 'pdf'],
    generatedAt: new Date().toISOString(),
    previewUrl: `https://${id}.preview.pages.dev`,
    gateHistory: [
      { gate: 'research', status: 'passed', startedAt: '', completedAt: '' },
      { gate: 'specification', status: 'passed', startedAt: '', completedAt: '' },
      { gate: 'implementation', status: 'passed', startedAt: '', completedAt: '' },
      { gate: 'qa', status: 'passed', startedAt: '', completedAt: '' },
      { gate: 'deployment', status: 'passed', startedAt: '', completedAt: '' },
      { gate: 'registration', status: 'passed', startedAt: '', completedAt: '' },
    ],
  }
}

test('portfolio tracks verticals by status', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: 'v1',
    name: 'V1',
    domain: 'v1.example.com',
    repository: 'org/repo1',
    status: 'building',
    gateCount: 3,
    allGatesPassed: false,
    capabilities: [],
  })
  portfolio.add({
    verticalId: 'v2',
    name: 'V2',
    domain: 'v2.example.com',
    repository: 'org/repo2',
    status: 'production',
    gateCount: 6,
    allGatesPassed: true,
    capabilities: [],
  })

  assert.equal(portfolio.list().length, 2)
  assert.equal(portfolio.list({ status: 'building' }).length, 1)
  assert.equal(portfolio.list({ status: 'production' }).length, 1)
})

test('portfolio importFromManifest detects all gates passed', () => {
  const portfolio = new VerticalPortfolio()
  const manifest = makeManifest('test-v', 'test.example.com')
  portfolio.importFromManifest(manifest)

  const entry = portfolio.get('test-v')
  assert.ok(entry)
  assert.equal(entry!.allGatesPassed, true)
  assert.equal(entry!.status, 'previewing')
  assert.equal(entry!.gateCount, 6)
})

test('portfolio summary aggregates correctly', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.importFromManifest(makeManifest('v1', 'v1.com'))
  portfolio.importFromManifest(makeManifest('v2', 'v2.com'))
  portfolio.markProduction('v1', 'https://v1.com')

  const summary = portfolio.getSummary()
  assert.equal(summary.total, 2)
  assert.equal(summary.uniqueDomains, 2)
  assert.equal(summary.byStatus.production, 1)
  assert.equal(summary.byStatus.previewing, 1)
  assert.equal(summary.passedGates, 2)
  assert.equal(summary.inProduction, 1)
})

test('portfolio marks registered and rejected', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: 'v1',
    name: 'V1',
    domain: 'v1.com',
    repository: 'org/r1',
    status: 'previewing',
    gateCount: 6,
    allGatesPassed: true,
    capabilities: [],
  })

  portfolio.markRegistered('v1', {
    verticalId: 'v1',
    name: 'V1',
    previewUrl: 'https://v1.preview.pages.dev',
    productionUrl: 'https://v1.com',
    status: 'registered',
    registeredAt: new Date().toISOString(),
    capabilities: [],
  })

  assert.equal(portfolio.get('v1')!.status, 'registered')
  assert.ok(portfolio.get('v1')!.registeredAt)
  assert.ok(portfolio.get('v1')!.registration)

  portfolio.markRejected('v1')
  assert.equal(portfolio.get('v1')!.status, 'rejected')
})

test('portfolio finds by domain and repository', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: 'v1',
    name: 'V1',
    domain: 'unique.example.com',
    repository: 'org/unique-repo',
    status: 'building',
    gateCount: 0,
    allGatesPassed: false,
    capabilities: [],
  })

  assert.ok(portfolio.getByDomain('unique.example.com'))
  assert.ok(portfolio.getByRepository('org/unique-repo'))
  assert.equal(portfolio.getByDomain('notfound.com'), undefined)
})
