import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GitHubFactoryAdapter,
  StubFactoryAdapter,
  StubModelProvider,
  StubDeploymentProvider,
  InMemoryRegistryProvider,
  CloudflareDeploymentBridge,
  EcosystemRegistryBridge,
  generateVerticalCode,
  validateManifest,
  createManifest,
  startGate,
  completeGate,
  getLatestGateStatus,
  allGatesPassed,
  type VerticalCandidate,
} from './index.js'

function makeCandidate(): VerticalCandidate {
  return {
    id: 'test-vertical-001',
    name: 'Test Vertical',
    description: 'A test vertical for unit testing',
    findings: [
      { source: 'market-research', claim: 'Strong demand in this niche', confidence: 0.85, capturedAt: new Date().toISOString() },
      { source: 'competition-analysis', claim: 'Low competition barriers', confidence: 0.75, capturedAt: new Date().toISOString() },
    ],
    score: { demand: 80, competition: 70, differentiation: 85, reuse: 90, feasibility: 75, risk: 20, overall: 80 },
  }
}

// ── Manifest Tests ────────────────────────────────────────────────────────────

test('manifest rejects original MailMyPDF repository', () => {
  const manifest = createManifest({
    id: 'test',
    name: 'Test',
    domain: 'test.com',
    repository: 'mycomind4-arch/mailmypdf',
    branch: 'main',
    capabilities: [],
  })
  assert.throws(() => validateManifest(manifest), /original MailMyPDF repository as a vertical target/)
})

test('manifest rejects mailmypdf.ai domain', () => {
  const manifest = createManifest({
    id: 'test',
    name: 'Test',
    domain: 'mailmypdf.ai',
    repository: 'org/test-repo',
    branch: 'main',
    capabilities: [],
  })
  assert.throws(() => validateManifest(manifest), /outside autonomous vertical scope/)
})

test('manifest gate history tracks progress', () => {
  let manifest = createManifest({
    id: 'test',
    name: 'Test',
    domain: 'example.com',
    repository: 'org/test',
    branch: 'foundry/test',
    capabilities: [],
  })
  assert.equal(getLatestGateStatus(manifest, 'research'), undefined)
  manifest = startGate(manifest, 'research')
  assert.equal(getLatestGateStatus(manifest, 'research'), 'in_progress')
  manifest = completeGate(manifest, 'research', 'passed', 'Research completed successfully')
  assert.equal(getLatestGateStatus(manifest, 'research'), 'passed')
})

test('allGatesPassed returns false until every gate passes', () => {
  let manifest = createManifest({
    id: 'test',
    name: 'Test',
    domain: 'example.com',
    repository: 'org/test',
    branch: 'foundry/test',
    capabilities: [],
  })
  assert.equal(allGatesPassed(manifest), false)
  const gates = ['research', 'specification', 'implementation', 'qa', 'deployment', 'registration'] as const
  for (const gate of gates) {
    manifest = startGate(manifest, gate)
    manifest = completeGate(manifest, gate, 'passed')
  }
  assert.equal(allGatesPassed(manifest), true)
})

// ── Code Generator Tests ──────────────────────────────────────────────────────

test('code generator produces static site with landing page', () => {
  const candidate = makeCandidate()
  const result = generateVerticalCode({ candidate, framework: 'static', domain: 'test.example.com' })
  assert.ok(result.files.length >= 3)
  const indexHtml = result.files.find((f) => f.path === 'index.html')
  assert.ok(indexHtml, 'index.html should be generated')
  assert.ok(indexHtml!.content.includes(candidate.name))
  assert.ok(indexHtml!.content.includes(candidate.description))
  assert.equal(result.buildConfig.framework, 'static')
})

test('code generator produces security headers', () => {
  const candidate = makeCandidate()
  const result = generateVerticalCode({ candidate, framework: 'static', domain: 'test.example.com' })
  const headers = result.files.find((f) => f.path === '_headers')
  assert.ok(headers, '_headers file should be generated')
  assert.ok(headers!.content.includes('X-Frame-Options'))
  assert.ok(headers!.content.includes('Strict-Transport-Security'))
})

test('code generator escapes HTML in content', () => {
  const candidate: VerticalCandidate = {
    ...makeCandidate(),
    findings: [{ source: '<script>alert(1)</script>', claim: 'Test <b>bold</b>', confidence: 1, capturedAt: new Date().toISOString() }],
  }
  const result = generateVerticalCode({ candidate, framework: 'static', domain: 'test.example.com' })
  const indexHtml = result.files.find((f) => f.path === 'index.html')!
  assert.ok(!indexHtml.content.includes('<script>alert(1)</script>'), 'HTML should be escaped')
})

// ── Stub Provider Tests ───────────────────────────────────────────────────────

test('stub model provider returns deterministic response', async () => {
  const provider = new StubModelProvider()
  const result = await provider.run({ role: 'researcher', objective: 'test', modelClass: 'FAST' })
  assert.ok(result.content.includes('[stub]'))
  assert.equal(result.model, 'stub')
  assert.equal(result.modelClass, 'FAST')
  assert.ok(result.warnings?.some((w) => w.includes('stub')))
})

test('stub deployment provider returns preview URL', async () => {
  const provider = new StubDeploymentProvider()
  const result = await provider.preview('org/repo', 'foundry/test')
  assert.equal(result.status, 'PREVIEW')
  assert.ok(result.url.includes('preview.pages.dev'))
  assert.ok(result.deploymentId.includes('stub'))
})

test('in-memory registry provider tracks registrations', async () => {
  const provider = new InMemoryRegistryProvider()
  const result = await provider.register({ verticalId: 'test-001', previewUrl: 'https://preview.example.com' })
  assert.equal(result.registered, true)
  const check = await provider.isRegistered('test-001')
  assert.equal(check.registered, true)
  const list = await provider.list()
  assert.equal(list.length, 1)
})

// ── Bridge Tests ───────────────────────────────────────────────────────────────

test('CloudflareDeploymentBridge wraps provider for deployment gate', async () => {
  const stubDeploy = new StubDeploymentProvider()
  const bridge = new CloudflareDeploymentBridge(stubDeploy)
  const result = await bridge.deploy({ repository: 'org/repo', branch: 'foundry/test', preview: true })
  assert.equal(result.status, 'PREVIEW')
  assert.ok(result.url.includes('preview.pages.dev'))
})

test('EcosystemRegistryBridge rejects unverified verticals', async () => {
  const registry = new InMemoryRegistryProvider()
  const bridge = new EcosystemRegistryBridge(registry)
  await assert.rejects(
    () => bridge.register({ verticalId: 'test', previewUrl: 'https://example.com', verified: false }),
    /must be verified/,
  )
})

test('EcosystemRegistryBridge registers verified verticals', async () => {
  const registry = new InMemoryRegistryProvider()
  const bridge = new EcosystemRegistryBridge(registry)
  const result = await bridge.register({ verticalId: 'test', previewUrl: 'https://example.com', verified: true })
  assert.equal(result.registered, true)
  assert.equal(result.verticalId, 'test')
})

// ── Factory Adapter Tests ─────────────────────────────────────────────────────

test('stub factory adapter plans build without touching GitHub', async () => {
  const adapter = new StubFactoryAdapter()
  const result = await adapter.createBuild({
    candidate: makeCandidate(),
    repository: 'org/test-repo',
    branch: 'foundry/test-001',
  })
  assert.equal(result.status, 'PLANNED')
})

test('factory adapters reject original MailMyPDF repository', async () => {
  const adapter = new StubFactoryAdapter()
  await assert.rejects(
    () => adapter.createBuild({ candidate: makeCandidate(), repository: 'mycomind4-arch/mailmypdf', branch: 'main' }),
    /original MailMyPDF/i,
  )
})
