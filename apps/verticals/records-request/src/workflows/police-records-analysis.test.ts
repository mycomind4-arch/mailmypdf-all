import { describe, expect, it } from 'vitest'
import { analyzePoliceProduction } from './police-records-analysis'

describe('police production analysis', () => {
  const requested = [
    { id:'incident-report', label:'Incident reports', keywords:['incident','report'] },
    { id:'body-camera', label:'Body-camera', keywords:['body-camera','bodycam'] },
    { id:'dispatch-cad', label:'Dispatch / CAD', keywords:['CAD','dispatch'] },
  ] as const

  it('flags missing requested categories and partial production', () => {
    const result = analyzePoliceProduction(requested, [
      { id:'r1', filename:'incident-report.pdf', text:'Incident report 2026-00123' },
    ])
    expect(result.coveredCategoryIds).toContain('incident-report')
    expect(result.missingCategoryIds).toEqual(['body-camera','dispatch-cad'])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'PARTIAL_PRODUCTION' }))
  })

  it('detects duplicate media by SHA-256', () => {
    const result = analyzePoliceProduction([], [
      { id:'r1', filename:'bodycam-a.mp4', category:'body-camera', sha256:'same' },
      { id:'r2', filename:'bodycam-b.mp4', category:'body-camera', sha256:'same' },
    ])
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'DUPLICATE_RECORD', recordIds:['r1','r2'] }))
  })

  it('detects an identifier mismatch conservatively', () => {
    const result = analyzePoliceProduction([], [{
      id:'r1', filename:'report.pdf', text:'Incident report number 2026-00999',
    }], { incidentNumber:'2026-00123' })
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'INCIDENT_IDENTIFIER_MISMATCH' }))
  })

  it('flags referenced records and withholding language for review', () => {
    const result = analyzePoliceProduction([], [{
      id:'r1', filename:'response.pdf', text:'See attached supplemental report. Portions are redacted and withheld.',
    }])
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type:'REFERENCED_RECORD_NOT_PRODUCED' }),
      expect.objectContaining({ type:'REDACTION_REVIEW' }),
    ]))
  })

  it('does not count a generic response that merely references CAD as produced CAD', () => {
    const result = analyzePoliceProduction(
      [{ id:'dispatch-cad', label:'Dispatch / CAD', keywords:['CAD','dispatch'] }],
      [{ id:'r1', filename:'response.pdf', text:'See attached CAD record.' }],
    )
    expect(result.coveredCategoryIds).not.toContain('dispatch-cad')
    expect(result.missingCategoryIds).toContain('dispatch-cad')
    expect(result.findings).toContainEqual(expect.objectContaining({ type:'REFERENCED_RECORD_NOT_PRODUCED' }))
  })

  it('does not treat absent media as proof that media does not exist', () => {
    const result = analyzePoliceProduction(
      [{ id:'body-camera', label:'Body Camera', keywords:['body-camera'] }],
      [{ id:'r1', filename:'incident.pdf', text:'Incident report only' }],
    )
    const finding = result.findings.find((item) => item.type === 'MISSING_MEDIA')
    expect(finding?.description).toContain('not proof')
  })
})
