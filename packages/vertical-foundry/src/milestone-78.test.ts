/**
 * Milestone 78: Vertical Discovery & Research Pipeline — Tests
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { discoverVerticals, type DiscoveryInput } from './discovery-pipeline.js'

const realInput: DiscoveryInput = {
  keywords: [
    { keyword: 'send certified mail online', monthlyVolume: 18000, keywordDifficulty: 22, cpc: 3.50, intent: 'transactional', trend: 'rising' },
    { keyword: 'certified mail from home', monthlyVolume: 8100, keywordDifficulty: 18, cpc: 2.80, intent: 'commercial', trend: 'stable' },
    { keyword: 'mail invoice online', monthlyVolume: 8100, keywordDifficulty: 18, cpc: 2.50, intent: 'transactional', trend: 'rising' },
    { keyword: 'send invoice by mail service', monthlyVolume: 4400, keywordDifficulty: 14, cpc: 3.20, intent: 'commercial', trend: 'stable' },
    { keyword: 'send legal notice certified mail', monthlyVolume: 5500, keywordDifficulty: 15, cpc: 4.00, intent: 'transactional', trend: 'rising' },
    { keyword: 'eviction notice mailing service', monthlyVolume: 2900, keywordDifficulty: 12, cpc: 3.80, intent: 'commercial', trend: 'rising' },
    { keyword: 'mail tax documents', monthlyVolume: 6600, keywordDifficulty: 20, cpc: 2.20, intent: 'transactional', trend: 'stable' },
    { keyword: 'postcard marketing service', monthlyVolume: 12100, keywordDifficulty: 28, cpc: 4.50, intent: 'commercial', trend: 'rising' },
  ],
  competitors: [
    { competitor: 'LegalZoom', whatTheyDo: 'Online legal document preparation and filing', whatTheyMiss: 'No self-service PDF upload for certified mailing; requires consultation', gapScore: 75 },
    { competitor: 'Click2Mail', whatTheyDo: 'Online mailing service for letters and postcards', whatTheyMiss: 'No certified mail option; limited document upload', gapScore: 70 },
    { competitor: 'DocuSign', whatTheyDo: 'Electronic signature and document management', whatTheyMiss: 'No physical mailing capability at all', gapScore: 85 },
    { competitor: 'Stamps.com', whatTheyDo: 'Postage printing and shipping management', whatTheyMiss: 'Requires user to print and mail themselves; no fulfillment', gapScore: 80 },
  ],
  capabilities: [
    { capability: 'USPS Certified Mail with tracking', supported: true, notes: 'Full integration with USPS API for tracking numbers' },
    { capability: 'Batch printing and inserting', supported: true, notes: 'Industrial printing facility handles up to 10K pieces/day' },
    { capability: 'Postcard printing and mailing', supported: true, notes: 'Standard and oversized postcard formats supported' },
    { capability: 'HIPAA-compliant document handling', supported: false, notes: 'Not yet certified for medical documents' },
    { capability: 'Generic document mailing', supported: true, notes: 'Any PDF can be printed and mailed via First Class or Priority' },
  ],
}

test('M78: discovery produces multiple candidates from keyword data', () => {
  const result = discoverVerticals(realInput)
  assert.ok(result.candidates.length >= 3, `Expected ≥3 candidates, got ${result.candidates.length}`)
})

test('M78: candidates are sorted by score (highest first)', () => {
  const result = discoverVerticals(realInput)
  for (let i = 0; i < result.candidates.length - 1; i++) {
    assert.ok(result.candidates[i]!.score.overall >= result.candidates[i + 1]!.score.overall,
      `Candidate ${i} (${result.candidates[i]!.score.overall}) should be ≥ candidate ${i + 1} (${result.candidates[i + 1]!.score.overall})`)
  }
})

test('M78: top candidate has high overall score', () => {
  const result = discoverVerticals(realInput)
  assert.ok(result.topCandidate, 'No top candidate')
  assert.ok(result.topCandidate!.score.overall >= 70, `Top score ${result.topCandidate!.score.overall} too low`)
})

test('M78: each candidate has research findings with confidence scores', () => {
  const result = discoverVerticals(realInput)
  for (const candidate of result.candidates) {
    assert.ok(candidate.findings.length >= 2, `${candidate.name} has too few findings`)
    for (const f of candidate.findings) {
      assert.ok(f.confidence > 0 && f.confidence <= 1, `Finding confidence ${f.confidence} out of range`)
      assert.ok(f.claim.length > 10, `Finding claim too short`)
      assert.ok(f.source, `Missing source`)
    }
  }
})

test('M78: discovery filters out unsupported capabilities', () => {
  const result = discoverVerticals(realInput)
  // HIPAA/medical is not supported, so no medical candidate should appear
  const hasMedical = result.candidates.some(c => c.id.includes('medical') || c.id.includes('hipaa'))
  assert.ok(!hasMedical, 'Medical vertical appeared despite unsupported HIPAA capability')
})

test('M78: certified mail vertical is discovered', () => {
  const result = discoverVerticals(realInput)
  const certified = result.candidates.find(c => c.id.includes('certified'))
  assert.ok(certified, 'Certified mail vertical not discovered')
  assert.ok(certified!.findings.some(f => f.source === 'Keyword Research'))
  assert.ok(certified!.findings.some(f => f.source === 'Platform Capability Audit'))
})

test('M78: invoice mailing vertical is discovered', () => {
  const result = discoverVerticals(realInput)
  const invoice = result.candidates.find(c => c.id.includes('invoice'))
  assert.ok(invoice, 'Invoice mailing vertical not discovered')
  assert.ok(invoice!.score.overall >= 60)
})

test('M78: legal notice vertical is discovered', () => {
  const result = discoverVerticals(realInput)
  const legal = result.candidates.find(c => c.id.includes('legal'))
  assert.ok(legal, 'Legal notice vertical not discovered')
})

test('M78: postcard marketing vertical is discovered', () => {
  const result = discoverVerticals(realInput)
  const postcard = result.candidates.find(c => c.id.includes('postcard'))
  assert.ok(postcard, 'Postcard marketing vertical not discovered')
})

test('M78: candidate descriptions are meaningful', () => {
  const result = discoverVerticals(realInput)
  for (const candidate of result.candidates) {
    assert.ok(candidate.description.length > 50, `${candidate.name} description too short`)
    assert.ok(candidate.description.includes('PDF') || candidate.description.includes('mail'), 'Description should mention PDF or mail')
  }
})

test('M78: discovery result is serializable for storage', () => {
  const result = discoverVerticals(realInput)
  const serialized = JSON.stringify({
    analysisDate: result.analysisDate,
    totalOpportunities: result.totalOpportunities,
    topCandidate: result.topCandidate?.name,
    topScore: result.topCandidate?.score.overall,
    candidates: result.candidates.map(c => ({
      id: c.id, name: c.name, score: c.score.overall, findingCount: c.findings.length,
    })),
  })

  const parsed = JSON.parse(serialized)
  assert.ok(parsed.totalOpportunities >= 3)
  assert.ok(parsed.topCandidate)
  assert.ok(parsed.topScore >= 70)
  assert.equal(parsed.candidates.length, result.candidates.length)
})

test('M78: discovery with empty input returns no candidates', () => {
  const result = discoverVerticals({ keywords: [], competitors: [], capabilities: [] })
  assert.equal(result.candidates.length, 0)
  assert.equal(result.topCandidate, null)
})

test('M78: discovery with no matching capabilities returns no candidates', () => {
  const result = discoverVerticals({
    keywords: [{ keyword: 'drone delivery service', monthlyVolume: 50000, keywordDifficulty: 10, cpc: 5.0, intent: 'transactional', trend: 'rising' }],
    competitors: [],
    capabilities: [{ capability: 'USPS Certified Mail', supported: true, notes: 'Mail only' }],
  })
  assert.equal(result.candidates.length, 0)
})
