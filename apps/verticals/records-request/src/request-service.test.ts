import { test, expect } from 'vitest'
import assert from "node:assert/strict";
import { buildRequestAuditPayload, validateCreateRequest } from './request-service'

test('validateCreateRequest accepts a complete request', () => {
  const result = validateCreateRequest({
    title: 'Property enforcement records',
    agency: 'County Records Office',
    jurisdiction: 'CA',
    items: [{ category: 'Inspection records', description: 'All inspections for the property' }],
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.normalizedTitle, 'Property enforcement records')
    assert.equal(result.value.items.length, 1)
    assert.deepEqual(buildRequestAuditPayload(result.value).payload, {
      title: 'Property enforcement records',
      agency: 'County Records Office',
      itemCount: 1,
    })
  }
})

test('validateCreateRequest rejects incomplete requests', () => {
  const result = validateCreateRequest({ title: '', agency: '', items: [] })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.deepEqual(result.issues.map((issue) => issue.field), ['title', 'agency', 'items'])
  }
})

test('validateCreateRequest rejects incomplete request items', () => {
  const result = validateCreateRequest({
    title: 'Request',
    agency: 'Agency',
    items: [{ category: 'Emails', description: '' }],
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.issues[0]?.field, 'items.0.description')
  }
})
