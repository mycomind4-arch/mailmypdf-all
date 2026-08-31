import { describe, expect, it } from 'vitest'
import { buildPropertyPermitRecordsRequest, propertyPermitRecordsWorkflow } from './property-permit-records'

describe('property and permit records workflow', () => {
  it('builds a targeted request using property and permit identifiers', () => {
    const request = buildPropertyPermitRecordsRequest({
      agency:'Example Building Department', permitNumber:'BP-2026-00123', address:'100 Main St', parcelNumber:'APN-123',
      dateStart:'2024-01-01', dateEnd:'2026-01-31', projectDescription:'two-story addition',
      categories:['building-permits','inspection-records','approved-plans'],
    })
    expect(request.title).toContain('BP-2026-00123')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('permit number BP-2026-00123')
    expect(request.items[2].format).toContain('native digital files')
  })

  it('exposes the flagship workflow contract', () => {
    expect(propertyPermitRecordsWorkflow.id).toBe('property-permit-records')
    expect(propertyPermitRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(propertyPermitRecordsWorkflow.request.categories.length).toBeGreaterThan(8)
  })

  it('rejects a request with no usable property or permit identifier', () => {
    const request = buildPropertyPermitRecordsRequest({ agency:'Example', dateStart:'2026-01-01', dateEnd:'2026-01-31', projectDescription:'addition' })
    const validatedRequest = { ...request, normalizedTitle: request.title.replace(/\s+/g, ' '), normalizedAgency: request.agency.replace(/\s+/g, ' ') }
    expect(propertyPermitRecordsWorkflow.validateRequest(validatedRequest)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field:'identifiers' }),
    ]))
  })

  it('ignores unknown categories', () => {
    const request = buildPropertyPermitRecordsRequest({ agency:'Example', permitNumber:'BP-1', dateStart:'2026-01-01', dateEnd:'2026-01-31', projectDescription:'addition', categories:['building-permits','<script>','unknown'] })
    expect(request.items.map((item) => item.category)).toEqual(['building-permits'])
  })
})
