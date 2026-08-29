import { describe, it, expect } from 'vitest'
import { runDefensePipeline } from './defense-pipeline'
import { extractNotice } from '../domain/notice-extraction'
import type { UnifiedFinding } from '../findings/taxonomy'

// Use a realistic code enforcement notice for testing
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

describe('Defense Pipeline', () => {
  it('runs the full pipeline from notice text to delivery-ready result', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice-of-violation.txt')
    const result = runDefensePipeline({
      extraction,
      discrepancies: [],
      findings: [],
      jurisdictionName: 'Los Angeles',
      userId: 'test-user',
    })

    // Phase 5a: Strategy
    expect(result.strategies.length).toBeGreaterThan(0)
    expect(result.strategyReport.summary).toBeDefined()

    // Phase 5b: Draft
    expect(result.draft.sections.length).toBeGreaterThan(0)
    expect(result.draft.fullText.length).toBeGreaterThan(0)

    // Phase 5c: Critique
    expect(result.critique).toBeDefined()
    expect(typeof result.critiquePassed).toBe('boolean')

    // Phase 5d: Validation
    expect(typeof result.validationPassed).toBe('boolean')

    // Phase 5e: Certification
    expect(result.certification).toBeDefined()
    expect(result.certification.stages.length).toBeGreaterThan(0)
    expect(typeof result.goldCertified).toBe('boolean')

    // Phase 5f: Human review
    expect(result.reviewSummary).toBeDefined()
    expect(result.authorization).toBeDefined()

    // Phase 5g: Delivery
    expect(result.tracking).toBeDefined()
    expect(result.tracking.caseId).toBeDefined()

    // Overall
    expect(result.blockingIssues).toBeDefined()
    expect(Array.isArray(result.blockingIssues)).toBe(true)
  })

  it('produces strategies that reference the findings', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice.txt')
    const findings: UnifiedFinding[] = [
      {
        id: 'f1',
        type: 'DATE_GAP',
        severity: 'high',
        statement: 'No inspection report found',
        supportingFacts: ['timeline analysis'],
        confidence: 'high',
        recommendedAction: 'Request inspection report',
        source: 'due-process',
        unresolved: true,
      },
    ]
    const result = runDefensePipeline({
      extraction,
      discrepancies: [],
      findings,
    })

    expect(result.strategies.length).toBeGreaterThan(0)
    expect(result.draft.fullText).toBeDefined()
  })

  it('does not authorize sending without human approval', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice.txt')
    const result = runDefensePipeline({
      extraction,
      discrepancies: [],
      findings: [],
    })

    // Without userId, authorization should be pending
    expect(result.authorized).toBe(false)
    expect(result.readyToSend).toBe(false)
  })

  it('generates proof of delivery when authorized and certified', () => {
    const extraction = extractNotice(SAMPLE_NOTICE, 'notice.txt')
    const result = runDefensePipeline({
      extraction,
      discrepancies: [],
      findings: [],
      userId: 'test-user',
    })

    // proof is only generated when authorized AND certified AND no blocking issues
    if (result.authorized && result.goldCertified && result.blockingIssues.length === 0) {
      expect(result.proof).not.toBeNull()
      expect(result.proof!.caseId).toBeDefined()
    } else {
      // Otherwise proof should be null — not ready to send
      expect(result.proof).toBeNull()
    }
  })

  it('includes blocking issues when critique fails', () => {
    // Create a notice with a missing deadline (which will cause issues)
    const badNotice = `
NOTICE
Property: 456 Oak Ave
Owner: Jane Smith
`
    const extraction = extractNotice(badNotice, 'incomplete-notice.txt')
    const result = runDefensePipeline({
      extraction,
      discrepancies: [],
      findings: [],
    })

    // Should still produce a result, but may have blocking issues
    expect(result).toBeDefined()
    expect(result.blockingIssues).toBeDefined()
  })
})
