import { describe, it, expect } from 'vitest'
import {
  isGapFinding,
  buildRecordsRequestPrefill,
  analyzeProduction,
  type UnifiedFinding,
} from './integration'
import type { FindingType } from '../findings/taxonomy'

function makeFinding(type: FindingType, overrides: Partial<UnifiedFinding> = {}): UnifiedFinding {
  return {
    id: `test-${type}-${Math.random()}`,
    type,
    severity: 'high',
    statement: `Test finding for ${type}`,
    supportingFacts: ['fact-1'],
    confidence: 'high',
    recommendedAction: 'Test action',
    source: 'due-process',
    unresolved: true,
    ...overrides,
  }
}

describe('Records Requests Integration', () => {
  describe('isGapFinding', () => {
    it('returns true for gap-indicating finding types', () => {
      const gapTypes: FindingType[] = [
        'MISSING_REQUESTED_CATEGORY',
        'REFERENCED_RECORD_NOT_PRODUCED',
        'MISSING_ATTACHMENT',
        'PARTIAL_PRODUCTION',
        'PRODUCTION_AMBIGUITY',
        'NO_PRIOR_NOTICE',
        'DATE_GAP',
      ]
      for (const type of gapTypes) {
        expect(isGapFinding(makeFinding(type))).toBe(true)
      }
    })

    it('returns false for non-gap finding types', () => {
      expect(isGapFinding(makeFinding('FACIAL_DEFECT'))).toBe(false)
      expect(isGapFinding(makeFinding('CONTRADICTION'))).toBe(false)
      expect(isGapFinding(makeFinding('HEARING_RIGHT_VIOLATION'))).toBe(false)
    })
  })

  describe('buildRecordsRequestPrefill', () => {
    it('builds a prefill from case data and gap findings', () => {
      const prefill = buildRecordsRequestPrefill({
        agencyName: 'Code Enforcement Division',
        jurisdiction: 'Los Angeles County',
        propertyAddress: '123 Main St',
        apn: 'APN-12345',
        caseNumber: 'CASE-001',
        recipientName: 'John Doe',
        noticeDate: '2025-01-01',
        deadlineDate: '2025-02-01',
        gapFindings: [makeFinding('NO_PRIOR_NOTICE')],
      })
      expect(prefill.agency).toBe('Code Enforcement Division')
      expect(prefill.property).toBe('123 Main St')
      expect(prefill.parcelNumber).toBe('APN-12345')
      expect(prefill.caseNumber).toBe('CASE-001')
      expect(prefill.subjectMatter.length).toBeGreaterThan(0)
      expect(prefill.subjectMatter).toContain('Proof of mailing / service of notice')
    })

    it('always includes core code enforcement categories', () => {
      const prefill = buildRecordsRequestPrefill({
        gapFindings: [],
      })
      expect(prefill.subjectMatter).toContain('Complaint or intake form that initiated the case')
      expect(prefill.subjectMatter).toContain('All inspection reports and photographs')
      expect(prefill.subjectMatter).toContain('Notice of violation and proof of service')
      expect(prefill.subjectMatter).toContain('All correspondence with property owner')
    })

    it('starts in draft status', () => {
      const prefill = buildRecordsRequestPrefill({ gapFindings: [] })
      expect(prefill.status).toBe('draft')
    })
  })

  describe('analyzeProduction', () => {
    it('flags missing requested categories', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['inspection report'],
        referencedButNotProduced: [],
        identifierMismatches: [],
        redactedItems: [],
        duplicateItems: [],
      })
      expect(result.findings.some(f => f.type === 'MISSING_REQUESTED_CATEGORY')).toBe(true)
      expect(result.missingCategories.length).toBeGreaterThan(0)
    })

    it('flags referenced but not produced documents', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['complaint', 'inspection', 'notice', 'correspondence'],
        referencedButNotProduced:['Inspector logbook entry #42'],
        identifierMismatches: [],
        redactedItems: [],
        duplicateItems: [],
      })
      expect(result.findings.some(f => f.type === 'REFERENCED_RECORD_NOT_PRODUCED')).toBe(true)
    })

    it('flags unexplained redactions', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['complaint', 'inspection', 'notice', 'correspondence'],
        referencedButNotProduced: [],
        identifierMismatches: [],
        redactedItems: [{ description: 'Inspector name redacted', legalBasis: undefined }],
        duplicateItems: [],
      })
      expect(result.findings.some(f => f.type === 'UNEXPLAINED_REDACTION')).toBe(true)
    })

    it('flags identifier mismatches', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['complaint', 'inspection', 'notice', 'correspondence'],
        referencedButNotProduced: [],
        identifierMismatches: [{ field: 'APN', expected: '12345', actual: '67890' }],
        redactedItems: [],
        duplicateItems: [],
      })
      expect(result.findings.some(f => f.type === 'IDENTIFIER_MISMATCH')).toBe(true)
    })

    it('flags duplicate records', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['complaint', 'inspection', 'notice', 'correspondence'],
        referencedButNotProduced: [],
        identifierMismatches: [],
        redactedItems: [],
        duplicateItems: ['Inspection report dated 2025-01-15 (copy)'],
      })
      expect(result.findings.some(f => f.type === 'DUPLICATE_RECORD')).toBe(true)
    })

    it('marks request as fulfilled', () => {
      const request = buildRecordsRequestPrefill({ gapFindings: [] })
      const result = analyzeProduction({
        request,
        producedCategories: ['complaint', 'inspection', 'notice', 'correspondence'],
        referencedButNotProduced: [],
        identifierMismatches: [],
        redactedItems: [],
        duplicateItems: [],
      })
      expect(result.request.status).toBe('fulfilled')
    })
  })
})
