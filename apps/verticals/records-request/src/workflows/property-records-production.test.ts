import { describe, expect, it } from 'vitest'
import {
  PROPERTY_RECORD_CATEGORIES,
  buildPropertyRecordsRequest,
  productionPropertyRecordsWorkflow,
} from './property-records-production'

describe('production property records workflow', () => {
  it('builds a parcel-centered cross-custodian property request', () => {
    const request = buildPropertyRecordsRequest({
      agency: 'Example County Assessor',
      parcelNumber: 'APN-001',
      address: '100 Example Road',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Parcel ownership and assessment history',
      categories: [
        'assessor-parcel-characteristics-and-use-codes',
        'recorded-instruments-deeds-releases-and-notices',
        'property-tax-billing-payment-delinquency-and-redemption-records',
      ],
    })

    expect(request.title).toContain('APN-001')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Assessor parcel records')
    expect(request.items[1].description).toContain('Recorded deeds')
    expect(request.items[2].description).toContain('property-tax')
  })

  it('keeps the canonical property-records identity with a production contract', () => {
    expect(productionPropertyRecordsWorkflow.contractVersion).toBe(2)
    expect(productionPropertyRecordsWorkflow.manifest.id).toBe('property-records')
    expect(productionPropertyRecordsWorkflow.request.categories).toEqual(PROPERTY_RECORD_CATEGORIES)
    expect(productionPropertyRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing recorder and tax categories in a partial production', async () => {
    const request = buildPropertyRecordsRequest({
      agency: 'Example County Assessor',
      parcelNumber: 'APN-001',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Parcel history review',
      categories: [
        'assessor-parcel-characteristics-and-use-codes',
        'recorded-instruments-deeds-releases-and-notices',
        'property-tax-billing-payment-delinquency-and-redemption-records',
      ],
    })

    const analysis = await productionPropertyRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'assessor-parcel.pdf',
        category: 'assessor-parcel-characteristics-and-use-codes',
        text: 'Assessor parcel record. See attached deed reference and tax account record. Some fields were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('recorded-instruments-deeds-releases-and-notices')
    expect(analysis.missingCategoryIds).toContain('property-tax-billing-payment-delinquency-and-redemption-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
