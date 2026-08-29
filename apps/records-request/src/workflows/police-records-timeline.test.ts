import { describe, expect, it } from 'vitest'
import { buildPoliceRecordsTimeline } from './police-records-timeline'

describe('police records timeline', () => {
  it('builds provenance-linked incident and dispatch events', () => {
    const timeline = buildPoliceRecordsTimeline([
      { id:'r1', filename:'incident-report.pdf', text:'Incident report. Event date 2026-01-02 14:30.' },
      { id:'r2', filename:'cad.pdf', category:'dispatch-cad', text:'CAD dispatch event 2026-01-02 14:35.' },
    ])
    expect(timeline.events).toHaveLength(2)
    expect(timeline.events[0].sourceRecordIds).toEqual(['r1'])
    expect(timeline.events[1].type).toBe('dispatch')
    expect(timeline.events[1].date).toBe('2026-01-02T14:35')
  })

  it('flags conflicting dates for the same event type', () => {
    const timeline = buildPoliceRecordsTimeline([
      { id:'r1', filename:'report-a.pdf', text:'Incident report date 2026-01-02.' },
      { id:'r2', filename:'report-b.pdf', text:'Incident report date 2026-01-03.' },
    ])
    expect(timeline.contradictions).toContainEqual(expect.objectContaining({ id:'date-conflict-incident' }))
  })
})
