import { describe, expect, it } from 'vitest'
import {
  BIRTH_RECORD_CATEGORIES,
  buildBirthRecordsRequest,
  productionBirthRecordsWorkflow,
} from './birth-records-production'

describe('production birth records workflow', () => {
  it('builds an eligibility-aware birth records request', () => {
    const request = buildBirthRecordsRequest({
      agency: 'Example Vital Records Office',
      jurisdiction: 'Example State',
      recordName: 'Record Subject',
      birthYear: '2000',
      requesterCapacity: 'person named on the record',
      copyType: 'certified copy',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Obtain an eligible certified copy',
      categories: [
        'certificate-copy-type-and-availability',
        'eligibility-relationship-and-authorization-requirements',
        'application-order-and-submission-requirements',
      ],
    })

    expect(request.title).toContain('Record Subject')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('copy types')
    expect(request.items[1].description).toContain('eligibility rules')
    expect(request.items[2].description).toContain('application or order forms')
  })

  it('keeps the canonical birth-records identity with a production contract', () => {
    expect(productionBirthRecordsWorkflow.contractVersion).toBe(2)
    expect(productionBirthRecordsWorkflow.manifest.id).toBe('birth-records')
    expect(productionBirthRecordsWorkflow.request.categories).toEqual(BIRTH_RECORD_CATEGORIES)
    expect(productionBirthRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing eligibility and application requirements in a partial production', async () => {
    const request = buildBirthRecordsRequest({
      agency: 'Example Vital Records Office',
      jurisdiction: 'Example State',
      recordName: 'Record Subject',
      birthYear: '2000',
      requesterCapacity: 'person named on the record',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Determine lawful ordering requirements',
      categories: [
        'certificate-copy-type-and-availability',
        'eligibility-relationship-and-authorization-requirements',
        'application-order-and-submission-requirements',
      ],
    })

    const analysis = await productionBirthRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'copy-types.pdf',
        category: 'certificate-copy-type-and-availability',
        text: 'Copy types and availability. See attached eligibility requirements and application form. Some material is restricted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('eligibility-relationship-and-authorization-requirements')
    expect(analysis.missingCategoryIds).toContain('application-order-and-submission-requirements')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
