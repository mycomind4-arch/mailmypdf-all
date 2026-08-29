import assert from 'node:assert/strict'
import test from 'node:test'
import { runKeywordResearch, scoreKeywordOpportunity, type KeywordResearchProvider } from './keyword-research-agent.js'

test('transactional, rising keywords score above weak navigational terms', () => {
  const strong = scoreKeywordOpportunity({ source: 'test', keyword: 'send certified demand letter', intent: 'transactional', volume: 5000, difficulty: 35, cpc: 12, trend: 'rising', evidence: 'fixture' })
  const weak = scoreKeywordOpportunity({ source: 'test', keyword: 'example company login', intent: 'navigational', volume: 5000, difficulty: 80, cpc: 0, trend: 'stable', evidence: 'fixture' })
  assert.ok(strong > weak)
})

test('research report preserves evidence and rejects low-score opportunities', async () => {
  const provider: KeywordResearchProvider = { async research() { return [
    { source: 'fixture', keyword: 'small business payment demand letter', intent: 'transactional', volume: 4000, difficulty: 30, cpc: 9, trend: 'rising', evidence: 'search dataset fixture' },
    { source: 'fixture', keyword: 'random brand login', intent: 'navigational', volume: 100, difficulty: 90, cpc: 0, trend: 'falling', evidence: 'search dataset fixture' },
  ] } }
  const report = await runKeywordResearch(provider, { vertical: 'small-business', seedTopics: ['payment'], language: 'en' })
  assert.equal(report.keywords.length, 2)
  assert.equal(report.opportunities.length, 1)
  assert.equal(report.rejected.length, 1)
  assert.equal(report.keywords[0]?.source, 'fixture')
})
