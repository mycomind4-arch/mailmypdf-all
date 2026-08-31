import { describe, expect, it } from 'vitest'
import { buildCodeEnforcementTimeline } from './code-enforcement-timeline'

describe('code enforcement timeline', () => {
  it('extracts dated enforcement events', () => {
    const result = buildCodeEnforcementTimeline([
      { id: 'r1', text: 'Complaint received on 2026-01-10.' },
      { id: 'r2', text: 'Inspection completed on 2026-01-14.' },
      { id: 'r3', text: 'Notice of Violation issued on 2026-01-20.' },
    ])
    expect(result.events.map((event) => event.type)).toEqual(['complaint', 'inspection', 'notice'])
    expect(result.events.map((event) => event.date)).toEqual(['2026-01-10', '2026-01-14', '2026-01-20'])
  })

  it('flags conflicting dates for the same event type', () => {
    const result = buildCodeEnforcementTimeline([
      { id: 'r1', text: 'Inspection completed on 2026-01-14.' },
      { id: 'r2', text: 'Inspection report states inspection occurred 2026-01-16.' },
    ])
    expect(result.contradictions).toContainEqual(expect.objectContaining({
      description: expect.stringContaining('inspection'),
      severity: 'warning',
    }))
  })
})
