import { describe, expect, it } from 'vitest'
import { analyzeCodeEnforcementProduction } from './code-enforcement-analysis'

describe('code enforcement production analysis', () => {
  const requested = [
    { id: 'complaints', label: 'Complaints', keywords: ['complaint'] },
    { id: 'inspections', label: 'Inspections', keywords: ['inspection'] },
    { id: 'photographs', label: 'Photographs', keywords: ['photo', 'photograph'] },
  ] as const

  it('detects requested categories not located in a production', () => {
    const result = analyzeCodeEnforcementProduction(requested, [
      { id: 'r1', filename: 'inspection-report.pdf', category: 'Inspection' },
    ])

    expect(result.recordsReviewed).toBe(1)
    expect(result.coveredCategoryIds).toEqual(['inspections'])
    expect(result.missingCategoryIds).toEqual(['complaints', 'photographs'])
    expect(result.findings.filter((f) => f.type === 'MISSING_REQUESTED_CATEGORY')).toHaveLength(2)
  })

  it('detects duplicate records using content hashes', () => {
    const result = analyzeCodeEnforcementProduction([], [
      { id: 'r1', filename: 'a.pdf', sha256: 'same' },
      { id: 'r2', filename: 'b.pdf', sha256: 'same' },
    ])

    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'DUPLICATE_RECORD',
      recordIds: ['r1', 'r2'],
    }))
  })

  it('flags records containing withholding or redaction language for review', () => {
    const result = analyzeCodeEnforcementProduction([], [{
      id: 'r1',
      filename: 'response.pdf',
      text: 'See attached inspection report. Portions are redacted as exempt.',
    }])

    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'UNEXPLAINED_REDACTION',
      severity: 'warning',
    }))
  })

  it('detects a referenced record type that is absent from production', () => {
    const result = analyzeCodeEnforcementProduction(requested, [{
      id: 'r1',
      filename: 'case-response.pdf',
      category: 'Case File',
      text: 'See attached complaint COM-104 and inspection report INS-204.',
    }])

    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'REFERENCED_RECORD_NOT_PRODUCED',
      requestedCategoryId: 'complaints',
      severity: 'critical',
    }))
  })

  it('extracts and reconciles conflicting case and property identifiers', () => {
    const result = analyzeCodeEnforcementProduction([], [
      { id: 'r1', filename: 'case-100.pdf', text: 'Case 100 for 123 Main Street. APN 123-456.' },
      { id: 'r2', filename: 'case-200.pdf', text: 'Case 200 for 125 Main Street. APN 999-888.' },
    ])

    expect(result.identifierReconciliation.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'caseNumbers' }),
      expect.objectContaining({ field: 'parcelNumbers' }),
      expect.objectContaining({ field: 'addresses' }),
    ]))
    expect(result.findings.filter((f) => f.type === 'IDENTIFIER_MISMATCH')).toHaveLength(3)
  })

  it('flags a long chronology gap for human review', () => {
    const result = analyzeCodeEnforcementProduction([], [
      { id: 'r1', filename: 'notice.pdf', text: 'Notice dated January 1, 2024.' },
      { id: 'r2', filename: 'closure.pdf', text: 'Closure dated December 1, 2024.' },
    ])

    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'DATE_GAP',
      severity: 'warning',
    }))
  })
})
