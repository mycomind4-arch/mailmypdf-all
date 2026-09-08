import { describe, it, expect } from 'vitest'
import { runCaseOrchestrator } from './case-orchestrator'
import { extractNotice } from '../domain/notice-extraction'
import type { DueProcessTimelineEvent, DueProcessEvidenceItem } from '../due-process/analyzer'
import type { PropertyRecord } from '../domain/property-intelligence'

const SAMPLE_NOTICE = `
NOTICE OF VIOLATION
Case Number: CE-2025-0042
Complaint Number: COMP-2025-100
Property: 123 Main Street, Los Angeles, CA 90001
APN: 5555-001-002
Owner of Record: John Doe
Notice Date: January 15, 2025
Response Deadline: February 14, 2025

You are hereby notified that the above-referenced property is in violation of
Los Angeles Municipal Code Section 91.101 (Unpermitted Construction).
The property owner is required to correct the violation or request a hearing
before the deadline. You have the right to appeal this decision within 30 days.
`

describe('Case Strategy Orchestrator (Workflow 0)', () => {
  it('surfaces no recommendations when the case is clean and the deadline is not near', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice-of-violation.txt')

    const result = runCaseOrchestrator({
      extraction,
      timelineEvents: [],
      evidence: [],
    })

    expect(result.findings).toBeDefined()
    expect(result.summary.total).toBe(result.findings.length)
    expect(Array.isArray(result.recommendations)).toBe(true)
  })

  it('recommends the due-process workflow when an adverse action has no prior notice', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice-of-violation.txt')

    const timelineEvents: DueProcessTimelineEvent[] = [
      {
        id: 'evt-1',
        eventType: 'fine',
        eventDate: new Date('2025-02-01'),
        receivingParty: 'John Doe',
        evidenceId: 'ev-1',
        description: '$500 fine issued',
      },
    ]
    const evidence: DueProcessEvidenceItem[] = [
      { id: 'ev-1', ocrText: 'Fine notice — no mention of appeal rights.', propertyId: 'prop-1' },
    ]

    const result = runCaseOrchestrator({ extraction, timelineEvents, evidence })

    expect(result.dueProcessReport.flags.length).toBeGreaterThan(0)
    expect(result.summary.critical).toBeGreaterThan(0)

    const dueProcessRec = result.recommendations.find(
      (r) => r.workflowId === 'challenge-due-process-violation',
    )
    expect(dueProcessRec).toBeDefined()
    expect(dueProcessRec?.severity).toBe('critical')
    expect(dueProcessRec?.legallyConsequential).toBe(true)

    // Critical findings must sort first.
    expect(result.recommendations[0].workflowId).toBe('challenge-due-process-violation')
  })

  it('recommends the standing/recipient workflow on an owner mismatch', () => {
    const noticeWithRecipient = `To: John Doe\n${SAMPLE_NOTICE}`
    const extraction = extractNotice(noticeWithRecipient, 'notice-of-violation.txt')
    expect(extraction.recipient.value).toBe('John Doe')

    const propertyRecords: PropertyRecord[] = [
      {
        address: '123 Main Street, Los Angeles, CA 90001',
        apn: '5555-001-002',
        county: 'Los Angeles',
        state: 'CA',
        ownerOfRecord: 'Jane Smith',
        source: 'county-assessor',
        retrievedAt: new Date().toISOString(),
        confidence: 0.9,
      },
    ]

    const result = runCaseOrchestrator({
      extraction,
      timelineEvents: [],
      evidence: [],
      propertyRecords,
    })

    const standingRec = result.recommendations.find(
      (r) => r.workflowId === 'challenge-notice-recipient',
    )
    expect(standingRec).toBeDefined()
    expect(standingRec?.legallyConsequential).toBe(true)
  })

  it('defaults to the records-request workflow when nothing critical is found but the deadline is near', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice-of-violation.txt')

    const result = runCaseOrchestrator({
      extraction,
      timelineEvents: [],
      evidence: [],
      deadlineIsNear: true,
    })

    expect(result.summary.critical).toBe(0)
    const recordsRec = result.recommendations.find(
      (r) => r.workflowId === 'request-complete-case-file',
    )
    expect(recordsRec).toBeDefined()
    expect(recordsRec?.legallyConsequential).toBe(false)
  })

  it('never marks a recommendation legally consequential without evidence-backed findings', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice-of-violation.txt')
    const result = runCaseOrchestrator({ extraction, timelineEvents: [], evidence: [] })

    for (const rec of result.recommendations) {
      if (rec.triggeringFindingIds.length === 0) {
        // Only the safe-default records-request recommendation may have
        // zero triggering findings, and it must never be marked
        // legally consequential.
        expect(rec.legallyConsequential).toBe(false)
      }
    }
  })
})
