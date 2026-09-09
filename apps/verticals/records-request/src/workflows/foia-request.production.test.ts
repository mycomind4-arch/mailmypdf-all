import { describe, expect, it } from 'vitest'
import { buildFoiaRequest, FOIA_CATEGORIES, foiaRequestWorkflow } from './foia-request'

describe('production FOIA front door', () => {
  it('keeps the canonical federal route and v2 capability contract', () => {
    expect(foiaRequestWorkflow.id).toBe('foia-request')
    expect(foiaRequestWorkflow.seo.canonicalPath).toBe('/workflows/foia-request')
    expect(foiaRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(foiaRequestWorkflow.capabilities).toContain('deadline')
    expect(foiaRequestWorkflow.capabilities).toContain('approval')
    expect(foiaRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a component-aware federal request with processing and production controls', () => {
    const request = buildFoiaRequest({
      agency: 'Example Federal Agency',
      component: 'Example Component',
      recordsDescription: 'Existing records documenting the identified federal program decision.',
      subjectMatter: 'Federal program decision history',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      identifiers: 'File EX-200',
      custodians: 'Program office and records component',
      searchTerms: 'EX-200 program decision',
      preferredFormat: 'native electronic files and CSV where maintained',
      feePreference: 'notify requester before exceeding stated cost limit',
      feeWaiverOrExpediteBasis: 'requester-supplied factual basis for agency review',
    })
    expect(request.items).toHaveLength(FOIA_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'record-index-metadata-and-processing-status')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-cross-indexed-and-attachment-records')).toBe(true)
    expect(request.items.some(item => item.category === 'fees-clarification-referral-withholding-and-request-status')).toBe(true)
  })

  it('does not turn requester fee or expedite facts into an entitlement', () => {
    const request = buildFoiaRequest({
      agency: 'Example Federal Agency',
      recordsDescription: 'Existing records about the identified matter.',
      subjectMatter: 'Agency activity',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      feeWaiverOrExpediteBasis: 'requester factual statement',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('do not invent exemptions, deadlines, appeal rights, fee-waiver eligibility, or expedited-processing entitlement')
    expect(corpus).toContain('Do not assume classified')
    expect(corpus).not.toContain('provide password')
  })
})
