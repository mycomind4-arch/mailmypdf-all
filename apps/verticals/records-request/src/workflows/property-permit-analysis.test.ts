import { describe, expect, it } from 'vitest'
import { analyzePropertyPermitProduction } from './property-permit-analysis'

describe('property permit production analysis', () => {
  const requested = [
    { id:'building-permits', label:'Building permits', keywords:['building','permit'] },
    { id:'inspection-records', label:'Inspection records', keywords:['inspection'] },
    { id:'approved-plans', label:'Approved plans', keywords:['approved','plans'] },
  ] as const

  it('detects missing categories and partial production', () => {
    const result = analyzePropertyPermitProduction(requested,[
      { id:'r1', filename:'permit.pdf', text:'Building permit BP-1' },
    ])
    expect(result.coveredCategoryIds).toContain('building-permits')
    expect(result.missingCategoryIds).toEqual(['inspection-records','approved-plans'])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'PARTIAL_PRODUCTION' }))
  })

  it('detects duplicate records by SHA-256', () => {
    const result = analyzePropertyPermitProduction([], [
      { id:'a', filename:'a.pdf', sha256:'same' },
      { id:'b', filename:'b.pdf', sha256:'same' },
    ])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'DUPLICATE_RECORD', recordIds:['a','b'] }))
  })

  it('flags withholding language conservatively', () => {
    const result = analyzePropertyPermitProduction([], [{ id:'r1', filename:'response.pdf', text:'Approved plans are withheld as exempt.' }])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'REDACTION_REVIEW' }))
  })

  it('does not require a referenced document to be treated as produced', () => {
    const result = analyzePropertyPermitProduction([{ id:'approved-plans', label:'Approved plans', keywords:['approved','plans'] }],[{ id:'r1', filename:'response.pdf', text:'See attached approved plans.' }])
    expect(result.missingCategoryIds).toEqual(['approved-plans'])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'REFERENCED_RECORD_NOT_PRODUCED' }))
  })
})
