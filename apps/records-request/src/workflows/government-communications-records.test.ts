import { describe, expect, it } from 'vitest'
import { buildGovernmentCommunicationsRequest, governmentCommunicationsRecordsWorkflow } from './government-communications-records'

describe('government communications records workflow',()=>{
  it('builds targeted communications categories',()=>{
    const request=buildGovernmentCommunicationsRequest({agency:'City',dateStart:'2026-01-01',dateEnd:'2026-03-01',subjectMatter:'Downtown redevelopment',custodians:['Jane Smith'],keywords:['downtown','RFP'],categories:['emails','email-attachments','communications-with-outside-parties']})
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('custodians Jane Smith')
    expect(request.items[1].format).toContain('native electronic format')
    expect(request.normalizedTitle).toContain('Government Communications')
    expect(request.normalizedAgency).toBe('City')
  })
  it('exposes the flagship workflow contract',()=>{
    expect(governmentCommunicationsRecordsWorkflow.id).toBe('government-communications-records')
    expect(governmentCommunicationsRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(governmentCommunicationsRecordsWorkflow.request.categories.length).toBeGreaterThan(8)
  })
  it('requires meaningful search constraints',()=>{
    const request=buildGovernmentCommunicationsRequest({agency:'City',dateStart:'2026-01-01',dateEnd:'2026-03-01',subjectMatter:'redevelopment'})
    expect(governmentCommunicationsRecordsWorkflow.validateRequest(request)).toEqual(expect.arrayContaining([expect.objectContaining({field:'searchConstraints'})]))
  })
  it('ignores unknown categories',()=>{
    const request=buildGovernmentCommunicationsRequest({agency:'City',dateStart:'2026-01-01',dateEnd:'2026-03-01',subjectMatter:'redevelopment',custodians:['Jane'],categories:['emails','<script>','unknown']})
    expect(request.items.map(i=>i.category)).toEqual(['emails'])
  })
})
