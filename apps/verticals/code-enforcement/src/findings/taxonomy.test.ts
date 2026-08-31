import { describe, it, expect } from 'vitest'
import { createFinding, findingSummary, resolveFinding } from './taxonomy'
import type { FindingType, FindingSeverity, FindingConfidence, UnifiedFinding } from './taxonomy'
import { findingVMToUnified, discrepancyToUnified } from './converter'
import type { FindingViewModel } from '../ui/types/view-models'
import type { Discrepancy, DiscrepancyType } from '../domain/discrepancy-engine'

describe('Finding Taxonomy', () => {
  describe('createFinding', () => {
    it('creates a finding with all required fields', () => {
      const finding = createFinding({
        type: 'DATE_GAP',
        severity: 'high',
        statement: 'Unexplained gap in timeline',
        supportingFacts: ['fact-1', 'fact-2'],
        confidence: 'high',
        recommendedAction: 'Request records for the gap period',
        source: 'due-process',
      })
      expect(finding.id).toBeDefined()
      expect(finding.type).toBe('DATE_GAP')
      expect(finding.severity).toBe('high')
      expect(finding.unresolved).toBe(true)
      expect(finding.source).toBe('due-process')
    })

    it('throws if no supporting facts', () => {
      expect(() => createFinding({
        type: 'DATE_GAP',
        severity: 'high',
        statement: 'Test',
        supportingFacts: [],
        confidence: 'high',
        recommendedAction: 'Test',
        source: 'due-process',
      })).toThrow('at least one supporting fact')
    })

    it('defaults unresolved to true', () => {
      const finding = createFinding({
        type: 'FACIAL_DEFECT',
        severity: 'low',
        statement: 'Test',
        supportingFacts: ['f'],
        confidence: 'low',
        recommendedAction: 'Test',
        source: 'discrepancy',
      })
      expect(finding.unresolved).toBe(true)
    })
  })

  describe('findingSummary', () => {
    it('counts findings by severity', () => {
      const findings: UnifiedFinding[] = [
        { id: '1', type: 'DATE_GAP', severity: 'critical', statement: 'a', supportingFacts: ['f'], confidence: 'high', recommendedAction: 'x', source: 'due-process', unresolved: true },
        { id: '2', type: 'FACIAL_DEFECT', severity: 'high', statement: 'b', supportingFacts: ['f'], confidence: 'medium', recommendedAction: 'x', source: 'discrepancy', unresolved: true },
        { id: '3', type: 'CONTRADICTION', severity: 'low', statement: 'c', supportingFacts: ['f'], confidence: 'low', recommendedAction: 'x', source: 'investigation', unresolved: false },
      ]
      const summary = findingSummary(findings)
      expect(summary.total).toBe(3)
      expect(summary.critical).toBe(1)
      expect(summary.high).toBe(1)
      expect(summary.low).toBe(1)
      expect(summary.unresolved).toBe(2)
    })
  })

  describe('resolveFinding', () => {
    it('marks a finding as resolved', () => {
      const finding = createFinding({
        type: 'DATE_GAP',
        severity: 'high',
        statement: 'Test',
        supportingFacts: ['f'],
        confidence: 'high',
        recommendedAction: 'Test',
        source: 'due-process',
      })
      const resolved = resolveFinding(finding)
      expect(resolved.unresolved).toBe(false)
    })
  })
})

describe('Finding Converter', () => {
  describe('findingVMToUnified', () => {
    it('converts a FindingViewModel to UnifiedFinding', () => {
      const vm: FindingViewModel = {
        id: 'test-1',
        type: 'investigation_contradiction',
        title: 'Contradiction Found',
        severity: 'high',
        status: 'open',
        description: 'Two documents disagree',
        whatThisMeans: 'Requires investigation',
        evidence: ['doc-1', 'doc-2'],
        sources: [],
        humanReviewRequired: true,
      }
      const unified = findingVMToUnified(vm, 'investigation')
      expect(unified.id).toBe('test-1')
      expect(unified.statement).toBe('Two documents disagree')
      expect(unified.source).toBe('investigation')
      expect(unified.unresolved).toBe(true)
      expect(unified.supportingFacts).toEqual(['doc-1', 'doc-2'])
    })

    it('marks resolved findings correctly', () => {
      const vm: FindingViewModel = {
        id: 'test-2',
        type: 'test',
        title: 'Test',
        severity: 'low',
        status: 'resolved',
        description: 'Resolved issue',
        whatThisMeans: 'Done',
        evidence: ['doc'],
        sources: [],
        humanReviewRequired: false,
      }
      const unified = findingVMToUnified(vm)
      expect(unified.unresolved).toBe(false)
    })
  })

  describe('discrepancyToUnified', () => {
    it('converts a Discrepancy to UnifiedFinding', () => {
      const discrepancy: Discrepancy = {
        id: 'disc-1',
        type: 'recipient_mismatch' as DiscrepancyType,
        severity: 'high',
        evidence: 'Notice says John, records say Jane',
        rationale: 'Recipient name does not match property owner',
        confidence: 0.95,
        reviewState: 'open',
        involvesHighConsequence: true,
      }
      const unified = discrepancyToUnified(discrepancy)
      expect(unified.id).toBe('disc-1')
      expect(unified.type).toBe('IDENTIFIER_MISMATCH')
      expect(unified.source).toBe('discrepancy')
      expect(unified.statement).toContain('Recipient name')
      expect(unified.confidence).toBe('high')
    })

    it('maps timeline_inconsistency to DATE_GAP', () => {
      const discrepancy: Discrepancy = {
        id: 'disc-2',
        type: 'timeline_inconsistency' as DiscrepancyType,
        severity: 'medium',
        evidence: 'Dates conflict',
        rationale: 'Timeline does not add up',
        confidence: 0.7,
        reviewState: 'open',
        involvesHighConsequence: false,
      }
      const unified = discrepancyToUnified(discrepancy)
      expect(unified.type).toBe('DATE_GAP')
    })
  })
})
