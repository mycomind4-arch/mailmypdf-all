import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES,
  buildEvidencePropertyRoomRecordsRequest,
  evidencePropertyRoomRecordsWorkflow,
} from './evidence-property-room-records'

describe('evidence property room records workflow', () => {
  it('builds an item-centered custody and disposition request', () => {
    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      categories: [
        'evidence-and-property-inventory',
        'chain-of-custody-and-transfer-history',
        'release-return-and-disposition-records',
      ],
    })

    expect(request.title).toContain('EV-44')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Evidence/property inventory')
    expect(request.items[1].description).toContain('Chain-of-custody')
    expect(request.items[1].format).toContain('structured format')
    expect(request.items[2].description).toContain('final-status records')
  })

  it('declares the executable records capability contract', () => {
    expect(evidencePropertyRoomRecordsWorkflow.contractVersion).toBe(2)
    expect(evidencePropertyRoomRecordsWorkflow.manifest.id).toBe('evidence-property-room-records')
    expect(evidencePropertyRoomRecordsWorkflow.request.categories).toEqual(EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES)
    expect(evidencePropertyRoomRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('flags missing custody and disposition records in a partial production', async () => {
    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      categories: [
        'evidence-and-property-inventory',
        'chain-of-custody-and-transfer-history',
        'release-return-and-disposition-records',
      ],
    })

    const analysis = await evidencePropertyRoomRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'inventory.pdf',
          category: 'evidence-and-property-inventory',
          text: 'Evidence item EV-44 inventory. Chain of custody and disposition records are referenced but not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('chain-of-custody-and-transfer-history')
    expect(analysis.missingCategoryIds).toContain('release-return-and-disposition-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
