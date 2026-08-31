import { describe, expect, it } from 'vitest'
import { createRecordsWorkflow } from './workflow-factory'
import type { RecordsDomainCapability } from './workflows/domain-pack'
import type { ValidatedRequest } from './request-service'

describe('records workflow factory', () => {
  const capabilities: readonly RecordsDomainCapability[] = [
    'classification',
    'extraction',
    'deadline',
    'findings',
    'evidence',
    'strategy',
    'draft',
    'validation',
    'review',
    'approval',
    'mailing',
    'tracking',
    'proofAudit',
  ]

  const base = {
    id: 'code-enforcement-records',
    name: 'Code Enforcement Records',
    description: 'Request code enforcement records.',
    searchIntent: 'code enforcement records request',
    seo: {
      title: 'Code Enforcement Records Request',
      description: 'Build a targeted code enforcement records request.',
      canonicalPath: '/workflows/code-enforcement-records',
    },
    intake: [{ id: 'property', label: 'Property', required: true }],
    capabilities,
    request: {
      categories: ['violations'],
      build: (_input: Record<string, unknown>) => ({ title: 'Code enforcement', agency: 'County', items: [{ category: 'violations', description: 'Violation records' }] }),
    },
  }

  it('creates a versioned workflow contract with capability manifest', () => {
    const workflow = createRecordsWorkflow(base)
    const validated = {
      ...base.request.build({}),
      normalizedTitle: 'Code enforcement',
      normalizedAgency: 'County',
    } satisfies ValidatedRequest
    expect(workflow.contractVersion).toBe(2)
    expect(workflow.manifest.id).toBe('code-enforcement-records')
    expect(workflow.manifest.capabilities).toEqual(capabilities)
    expect(workflow.validateRequest(validated)).toEqual([])
  })

  it('rejects invalid workflow definitions', () => {
    expect(() => createRecordsWorkflow({ ...base, id: '' })).toThrow()
    expect(() => createRecordsWorkflow({ ...base, request: { ...base.request, categories: [] } })).toThrow()
    expect(() => createRecordsWorkflow({ ...base, capabilities: [] })).toThrow()
    expect(() => createRecordsWorkflow({ ...base, capabilities: ['evidence', 'evidence'] })).toThrow()
    expect(() => createRecordsWorkflow({ ...base, seo: { ...base.seo, canonicalPath: '/wrong' } })).toThrow()
  })
})
