import { describe, expect, it } from 'vitest'
import {
  buildCodeEnforcementRequest,
  codeEnforcementRecordsWorkflow,
  CODE_ENFORCEMENT_RECORD_CATEGORIES,
} from './code-enforcement-records'

describe('code enforcement records workflow', () => {
  const input = {
    agency: 'Example County',
    department: 'Code Enforcement',
    propertyAddress: '123 Main St',
    parcelNumber: 'APN-123',
    caseNumber: 'CE-2026-001',
    violationNumber: 'V-22',
    relatedParty: 'Example LLC',
    dateStart: '2024-01-01',
    dateEnd: '2026-01-31',
    subjectMatter: 'Unpermitted construction and related enforcement activity',
  }

  it('declares the full flagship contract', () => {
    expect(codeEnforcementRecordsWorkflow.contractVersion).toBe(2)
    expect(codeEnforcementRecordsWorkflow.id).toBe('code-enforcement-records')
    expect(codeEnforcementRecordsWorkflow.request.categories).toEqual(CODE_ENFORCEMENT_RECORD_CATEGORIES)
    expect(codeEnforcementRecordsWorkflow.manifest.capabilities).toHaveLength(17)
  })

  it('builds identifier-rich, date-bounded request items', () => {
    const request = buildCodeEnforcementRequest(input)
    expect(request.agency).toBe('Example County')
    expect(request.items).toHaveLength(CODE_ENFORCEMENT_RECORD_CATEGORIES.length)
    expect(request.items[0].dateStart).toBe('2024-01-01')
    expect(request.items[0].dateEnd).toBe('2026-01-31')
    expect(request.items.some((item) => item.description.includes('case number CE-2026-001'))).toBe(true)
    expect(request.items.some((item) => item.description.includes('property address 123 Main St'))).toBe(true)
  })

  it('rejects a domain request without a usable property or case identifier', () => {
    const request = buildCodeEnforcementRequest({
      agency: 'Example County',
      subjectMatter: 'Code issue',
      dateStart: '2024-01-01',
      dateEnd: '2024-12-31',
    })
    const validated = { ...request, normalizedTitle: request.title, normalizedAgency: request.agency }
    const issues = codeEnforcementRecordsWorkflow.validateRequest(validated)
    expect(issues.map((issue) => issue.field)).toContain('identifiers')
  })
})
