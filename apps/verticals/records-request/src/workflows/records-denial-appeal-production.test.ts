import { describe, expect, it } from 'vitest'
import { buildRecordsDenialAppealRequest, productionRecordsDenialAppealWorkflow, RECORDS_DENIAL_APPEAL_CATEGORIES } from './records-denial-appeal-production'

describe('production records denial appeal workflow', () => {
  it('preserves canonical identity and full production capabilities', () => {
    expect(productionRecordsDenialAppealWorkflow.id).toBe('records-denial-appeal')
    expect(productionRecordsDenialAppealWorkflow.seo.canonicalPath).toBe('/workflows/records-denial-appeal')
    expect(productionRecordsDenialAppealWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionRecordsDenialAppealWorkflow.capabilities).toContain('deadline')
    expect(productionRecordsDenialAppealWorkflow.capabilities).toContain('approval')
    expect(productionRecordsDenialAppealWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a denial review around exact agency reasoning and preserved original scope', () => {
    const request = buildRecordsDenialAppealRequest({
      agency: 'Example Records Office',
      jurisdiction: 'Example jurisdiction',
      originalRequestDate: '2026-08-01',
      originalRequestNumber: 'REQ-200',
      originalScopeSummary: 'Incident report, dispatch log, attachments, and related correspondence.',
      denialDate: '2026-08-25',
      denialBasisExact: 'Agency states that the identified category is withheld under the cited rule.',
      deniedCategories: 'dispatch log and attachments',
      partialProductionSummary: 'incident report produced',
      appealInstructions: 'Submit written administrative review to the office identified in the denial.',
      statedAppealDeadline: 'Agency states a review request is due by the date printed in the denial.',
      desiredOutcome: 'Review the withheld categories and release any lawfully disclosable portions',
      subjectMatter: 'The denial leaves the status of referenced attachments unresolved',
    })
    expect(request.items).toHaveLength(RECORDS_DENIAL_APPEAL_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'denial-letter-and-stated-basis')).toBe(true)
    expect(request.items.some(item => item.category === 'segregability-and-partial-disclosure-status')).toBe(true)
    expect(request.items.some(item => item.category === 'appeal-deadline-and-response-timeline')).toBe(true)
    expect(request.items[1]?.description).toContain('Stated basis: Agency states that the identified category is withheld')
  })

  it('does not invent appeal law, deadlines, routes, or record existence', () => {
    const request = buildRecordsDenialAppealRequest({
      agency: 'Example Records Office',
      jurisdiction: 'Example jurisdiction',
      originalRequestDate: '2026-08-01',
      originalScopeSummary: 'The original request as submitted.',
      denialDate: '2026-08-25',
      denialBasisExact: 'No responsive records located.',
      deniedCategories: 'original requested category',
      desiredOutcome: 'Request review of the documented search status',
      subjectMatter: 'Clarify the documented custodian and search status',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('do not invent a legal rule')
    expect(corpus).toContain('Do not invent an appeal route')
    expect(corpus).toContain('do not calculate or assert a controlling deadline')
    expect(corpus).toContain('Do not assert that an unverified record exists')
  })
})
