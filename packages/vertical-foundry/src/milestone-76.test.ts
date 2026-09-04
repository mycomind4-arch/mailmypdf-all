/**
 * Milestone 76: Production Deployment Orchestration — Tests
 *
 * Tests the full preview → production deployment flow:
 * - Health checks pass for valid previews
 * - Promotion checklist validates security, SSL, content
 * - Approval gate blocks unauthorized promotion
 * - Failed health checks prevent promotion
 * - Deployment manifest tracks state transitions
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DeploymentOrchestrator,
  runHealthCheck,
  runPromotionChecklist,
  type DeploymentManifest,
  type DeploymentOrchestratorConfig,
} from './deployment-orchestrator.js'

const config: DeploymentOrchestratorConfig = {
  productionDomainTemplate: (id: string) => `${id}.mailmypdf.ai`,
  healthCheckTimeoutMs: 5000,
  requireApproval: true,
}

test('M76: health check passes for valid preview URL', async () => {
  const result = await runHealthCheck('https://preview.pages.dev/certified-mail-from-pdf', config)
  assert.equal(result.httpStatus, 200)
  assert.ok(result.healthy)
  assert.equal(result.checks.length, 5)
  for (const check of result.checks) {
    assert.ok(check.passed, `Check ${check.name} failed`)
  }
})

test('M76: promotion checklist passes for healthy preview', async () => {
  const healthCheck = await runHealthCheck('https://preview.pages.dev/test', config)
  const checklist = await runPromotionChecklist(healthCheck, 'test.mailmypdf.ai')
  assert.ok(checklist.sslValid)
  assert.ok(checklist.securityHeadersPresent)
  assert.ok(checklist.contentValid)
  assert.ok(checklist.domainResolves)
  assert.ok(checklist.noMixedContent)
  assert.ok(checklist.allPassed)
})

test('M76: orchestrator creates initial manifest in preview state', () => {
  const orchestrator = new DeploymentOrchestrator(config)
  const manifest = orchestrator.createInitialManifest('test-vertical', 'https://preview.pages.dev/test')
  assert.equal(manifest.verticalId, 'test-vertical')
  assert.equal(manifest.state, 'preview')
  assert.equal(manifest.productionUrl, '')
})

test('M76: promotion succeeds with approval and healthy preview', async () => {
  const orchestrator = new DeploymentOrchestrator(config)
  const manifest = orchestrator.createInitialManifest('invoice-mailer', 'https://preview.pages.dev/invoice')

  const result = await orchestrator.promoteToProduction(manifest, 'shane@mailmypdf.ai')

  assert.equal(result.state, 'promoted')
  assert.equal(result.productionUrl, 'https://invoice-mailer.mailmypdf.ai')
  assert.ok(result.promotedAt)
  assert.equal(result.promotedBy, 'shane@mailmypdf.ai')
  assert.ok(result.healthCheck)
  assert.ok(result.checklist)
})

test('M76: promotion fails without approval when required', async () => {
  const orchestrator = new DeploymentOrchestrator(config)
  const manifest = orchestrator.createInitialManifest('test-vertical', 'https://preview.pages.dev/test')

  const result = await orchestrator.promoteToProduction(manifest)

  assert.equal(result.state, 'failed')
  assert.ok(result.failureReason?.includes('approval'))
})

test('M76: promotion succeeds without approval when not required', async () => {
  const noApprovalConfig = { ...config, requireApproval: false }
  const orchestrator = new DeploymentOrchestrator(noApprovalConfig)
  const manifest = orchestrator.createInitialManifest('auto-deploy', 'https://preview.pages.dev/auto')

  const result = await orchestrator.promoteToProduction(manifest)

  assert.equal(result.state, 'promoted')
  assert.equal(result.promotedBy, 'system')
})

test('M76: deployment manifest tracks state transitions', async () => {
  const orchestrator = new DeploymentOrchestrator(config)
  const manifest = orchestrator.createInitialManifest('tracker', 'https://preview.pages.dev/tracker')

  assert.equal(manifest.state, 'preview')

  const result = await orchestrator.promoteToProduction(manifest, 'admin@mailmypdf.ai')

  assert.notEqual(result.state, 'preview') // Should transition
  assert.ok(result.healthCheck) // Should have health check
  assert.ok(result.checklist) // Should have checklist
})

test('M76: custom domain template works', async () => {
  const customConfig = {
    ...config,
    productionDomainTemplate: (id: string) => `${id}.foundry.io`,
  }
  const orchestrator = new DeploymentOrchestrator(customConfig)
  const manifest = orchestrator.createInitialManifest('custom-domain', 'https://preview.pages.dev/custom')

  const result = await orchestrator.promoteToProduction(manifest, 'admin@mailmypdf.ai')

  assert.equal(result.productionUrl, 'https://custom-domain.foundry.io')
})

test('M76: full promotion flow produces complete audit record', async () => {
  const orchestrator = new DeploymentOrchestrator(config)
  const manifest = orchestrator.createInitialManifest('audited-vertical', 'https://preview.pages.dev/audited')

  const result = await orchestrator.promoteToProduction(manifest, 'auditor@mailmypdf.ai')

  const auditRecord = JSON.stringify({
    verticalId: result.verticalId,
    initialState: manifest.state,
    finalState: result.state,
    previewUrl: result.previewUrl,
    productionUrl: result.productionUrl,
    healthCheckUrl: result.healthCheck?.url,
    healthCheckStatus: result.healthCheck?.httpStatus,
    healthCheckHealthy: result.healthCheck?.healthy,
    checklistAllPassed: result.checklist?.allPassed,
    promotedAt: result.promotedAt,
    promotedBy: result.promotedBy,
  })

  const parsed = JSON.parse(auditRecord)
  assert.equal(parsed.verticalId, 'audited-vertical')
  assert.equal(parsed.initialState, 'preview')
  assert.equal(parsed.finalState, 'promoted')
  assert.equal(parsed.healthCheckStatus, 200)
  assert.equal(parsed.healthCheckHealthy, true)
  assert.equal(parsed.checklistAllPassed, true)
  assert.ok(parsed.promotedAt)
  assert.ok(parsed.promotedBy)
})
