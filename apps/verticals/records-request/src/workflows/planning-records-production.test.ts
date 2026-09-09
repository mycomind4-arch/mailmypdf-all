import { describe, expect, it } from 'vitest'
import {
  PLANNING_RECORD_CATEGORIES,
  buildPlanningRecordsRequest,
  productionPlanningRecordsWorkflow,
} from './planning-records-production'

describe('production planning records workflow', () => {
  it('builds a project-centered planning request', () => {
    const request = buildPlanningRecordsRequest({
      agency: 'Example Planning Department',
      projectNumber: 'PLN-2026-10',
      address: '100 Example Road',
      dateStart: '2025-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Development application and decision history',
      categories: [
        'application-intake-submittal-revision-and-status-history',
        'staff-report-analysis-findings-and-recommendations',
        'planning-commission-board-council-and-decision-records',
      ],
    })

    expect(request.title).toContain('PLN-2026-10')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Planning or land-use applications')
    expect(request.items[1].description).toContain('staff reports')
    expect(request.items[2].description).toContain('Agendas')
  })

  it('keeps the canonical planning-records identity with a production contract', () => {
    expect(productionPlanningRecordsWorkflow.contractVersion).toBe(2)
    expect(productionPlanningRecordsWorkflow.manifest.id).toBe('planning-records')
    expect(productionPlanningRecordsWorkflow.request.categories).toEqual(PLANNING_RECORD_CATEGORIES)
    expect(productionPlanningRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing staff and decision records in a partial production', async () => {
    const request = buildPlanningRecordsRequest({
      agency: 'Example Planning Department',
      projectNumber: 'PLN-2026-10',
      dateStart: '2025-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Development application review',
      categories: [
        'application-intake-submittal-revision-and-status-history',
        'staff-report-analysis-findings-and-recommendations',
        'planning-commission-board-council-and-decision-records',
      ],
    })

    const analysis = await productionPlanningRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'application-index.pdf',
        category: 'application-intake-submittal-revision-and-status-history',
        text: 'Application index. See attached staff report and final decision record. Portions were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('staff-report-analysis-findings-and-recommendations')
    expect(analysis.missingCategoryIds).toContain('planning-commission-board-council-and-decision-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
