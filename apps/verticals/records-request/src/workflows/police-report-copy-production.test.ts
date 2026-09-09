import { describe, expect, it } from 'vitest'
import { buildPoliceReportCopyProductionRequest, POLICE_REPORT_COPY_CATEGORIES, productionPoliceReportCopyWorkflow } from './police-report-copy-production'

describe('production police report copy workflow', () => {
  it('keeps canonical identity and moves police report copy to v2', () => {
    expect(productionPoliceReportCopyWorkflow.id).toBe('police-report-copy')
    expect(productionPoliceReportCopyWorkflow.seo.canonicalPath).toBe('/workflows/police-report-copy')
    expect(productionPoliceReportCopyWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionPoliceReportCopyWorkflow.capabilities).toContain('approval')
  })

  it('builds a copy-specific scope with certification, redaction, fee and delivery controls', () => {
    const request = buildPoliceReportCopyProductionRequest({
      agency: 'Example Police Records Division',
      jurisdiction: 'Example City, Example State',
      reportNumber: 'PD-26-1234',
      reportDate: '2026-08-01',
      requesterName: 'Example Requester',
      requesterRelationship: 'involved party',
      copyType: 'ordinary copy; certified copy if available',
      includeSupplements: 'include all maintained supplements',
      includeAttachments: 'include diagrams and photographs where releasable',
      preferredFormat: 'PDF',
      deliveryPreference: 'electronic',
      feePreference: 'notify before costs exceed $40',
      subjectMatter: 'Need a complete copy of the identified report and maintained supplements.',
    })
    expect(request.items).toHaveLength(POLICE_REPORT_COPY_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'official-certified-stamped-or-authenticated-copy-status')).toBe(true)
    expect(request.items.some(item => item.category === 'redaction-unredacted-access-and-release-status')).toBe(true)
    expect(request.items.some(item => item.category === 'fee-cost-invoice-and-payment-instruction-records')).toBe(true)
    expect(request.items.some(item => item.category === 'delivery-pickup-mail-electronic-and-tracking-status')).toBe(true)
  })

  it('does not assume certification, unredacted access or payment credential collection', () => {
    const request = buildPoliceReportCopyProductionRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      reportNumber: 'R-1',
      reportDate: '2026-08-01',
      requesterName: 'Example Requester',
      subjectMatter: 'Copy request.',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('do not claim certification, authenticity, or official status unless the agency/source establishes it')
    expect(corpus).toContain('Do not assume an unredacted copy is available')
    expect(corpus).toContain('Do not collect or transmit card numbers, bank credentials')
  })
})
