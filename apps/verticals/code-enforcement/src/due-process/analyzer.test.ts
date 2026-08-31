import { describe, it, expect } from 'vitest'
import { DueProcessAnalyzer, type DueProcessTimelineEvent, type DueProcessEvidenceItem } from './analyzer'

describe('DueProcessAnalyzer', () => {
  const analyzer = new DueProcessAnalyzer()

  describe('analyze', () => {
    it('returns perfect score when no violations', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'notice', eventDate: new Date('2025-01-01'), receivingParty: 'owner' },
        { id: '2', eventType: 'hearing', eventDate: new Date('2025-01-20'), receivingParty: 'owner' },
        { id: '3', eventType: 'decision', eventDate: new Date('2025-02-01'), receivingParty: 'owner' },
      ]
      const evidence: DueProcessEvidenceItem[] = [
        { id: 'doc1', ocrText: 'You have the right to appeal this decision', propertyId: 'APN-1' },
      ]
      const report = analyzer.analyze(evidence, timeline)
      expect(report.overallScore).toBe(100)
      expect(report.flags.length).toBe(0)
    })

    it('flags no prior notice before adverse action', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'fine', eventDate: new Date('2025-01-15'), receivingParty: 'owner' },
      ]
      const report = analyzer.analyze([], timeline)
      expect(report.flags).toContainEqual(
        expect.objectContaining({ ruleId: 'notice_timing', severity: 'critical' })
      )
    })

    it('flags insufficient notice period', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'notice', eventDate: new Date('2025-01-10'), receivingParty: 'owner' },
        { id: '2', eventType: 'decision', eventDate: new Date('2025-01-13'), receivingParty: 'owner' },
      ]
      const report = analyzer.analyze([], timeline)
      expect(report.flags).toContainEqual(
        expect.objectContaining({ ruleId: 'notice_timing', severity: 'medium' })
      )
    })

    it('flags hearing right violation when adverse action without hearing', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'notice', eventDate: new Date('2025-01-01'), receivingParty: 'owner' },
        { id: '2', eventType: 'penalty', eventDate: new Date('2025-02-01'), receivingParty: 'owner' },
      ]
      const report = analyzer.analyze([], timeline)
      expect(report.flags).toContainEqual(
        expect.objectContaining({ ruleId: 'hearing_right', severity: 'critical' })
      )
    })

    it('flags missing appeal pathway in decision', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'notice', eventDate: new Date('2025-01-01'), receivingParty: 'owner' },
        { id: '2', eventType: 'hearing', eventDate: new Date('2025-01-20'), receivingParty: 'owner' },
        { id: '3', eventType: 'decision', eventDate: new Date('2025-02-01', ), receivingParty: 'owner', evidenceId: 'decision-doc' },
      ]
      const evidence: DueProcessEvidenceItem[] = [
        { id: 'decision-doc', ocrText: 'The property is in violation.', propertyId: 'APN-1' },
      ]
      const report = analyzer.analyze(evidence, timeline)
      expect(report.flags).toContainEqual(
        expect.objectContaining({ ruleId: 'appeal_pathway', severity: 'medium' })
      )
    })

    it('always sorts timeline chronologically regardless of input order', () => {
      const unsortedTimeline: DueProcessTimelineEvent[] = [
        { id: '3', eventType: 'decision', eventDate: new Date('2025-03-01'), receivingParty: 'owner' },
        { id: '1', eventType: 'notice', eventDate: new Date('2025-01-01'), receivingParty: 'owner' },
        { id: '2', eventType: 'hearing', eventDate: new Date('2025-02-01'), receivingParty: 'owner' },
      ]
      const report = analyzer.analyze([], unsortedTimeline)
      // With proper order: notice → hearing → decision, score should be good
      expect(report.overallScore).toBe(100)
    })
  })

  describe('toFindings', () => {
    it('converts flags to unified findings', () => {
      const timeline: DueProcessTimelineEvent[] = [
        { id: '1', eventType: 'fine', eventDate: new Date('2025-01-15'), receivingParty: 'owner' },
      ]
      const report = analyzer.analyze([], timeline)
      const findings = analyzer.toFindings(report)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings.every(f => f.source === 'due-process')).toBe(true)
      expect(findings.every(f => f.supportingFacts.length > 0)).toBe(true)
    })
  })
})
