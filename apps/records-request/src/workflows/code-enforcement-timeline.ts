export type CodeEnforcementEventType = 'complaint' | 'inspection' | 'notice' | 'citation' | 'order' | 'abatement' | 'permit' | 'correspondence' | 'hearing' | 'closure' | 'other'

export type CodeEnforcementEvent = {
  id: string
  type: CodeEnforcementEventType
  date?: string
  sourceRecordIds: string[]
  description: string
  certainty: 'documented' | 'inferred' | 'conflicting' | 'unknown'
}

export type TimelineContradiction = {
  id: string
  eventIds: string[]
  description: string
  severity: 'warning' | 'critical'
}

export type CodeEnforcementTimeline = {
  events: CodeEnforcementEvent[]
  contradictions: TimelineContradiction[]
}

const DATE_PATTERN = /\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/g
const TYPE_PATTERNS: Array<[CodeEnforcementEventType, RegExp]> = [
  ['complaint', /complaint/i],
  ['inspection', /inspection|inspected|inspector/i],
  ['notice', /notice of violation|violation notice|correction notice/i],
  ['citation', /citation|civil penalty/i],
  ['order', /administrative order|abatement order/i],
  ['abatement', /abatement|corrected|compliance/i],
  ['permit', /permit/i],
  ['hearing', /hearing/i],
  ['closure', /closed|closure|case closed/i],
  ['correspondence', /email|letter|correspondence/i],
]

export function buildCodeEnforcementTimeline(records: readonly { id: string; text?: string }[]): CodeEnforcementTimeline {
  const events: CodeEnforcementEvent[] = []
  for (const record of records) {
    const text = record.text ?? ''
    const dates = [...text.matchAll(DATE_PATTERN)]
    const date = dates[0] ? `${dates[0][1]}-${dates[0][2].padStart(2, '0')}-${dates[0][3].padStart(2, '0')}` : undefined
    const match = TYPE_PATTERNS.find(([, pattern]) => pattern.test(text))
    if (!match) continue
    events.push({
      id: `event-${record.id}`,
      type: match[0],
      date,
      sourceRecordIds: [record.id],
      description: text.slice(0, 500),
      certainty: date ? 'documented' : 'unknown',
    })
  }

  const contradictions: TimelineContradiction[] = []
  const byType = new Map<CodeEnforcementEventType, CodeEnforcementEvent[]>()
  for (const event of events) byType.set(event.type, [...(byType.get(event.type) ?? []), event])
  for (const [type, group] of byType) {
    const dated = group.filter((event) => event.date)
    if (dated.length < 2) continue
    const dates = new Set(dated.map((event) => event.date))
    if (dates.size > 1) {
      contradictions.push({
        id: `date-conflict-${type}`,
        eventIds: dated.map((event) => event.id),
        description: `Multiple dates were found for ${type} events; the source records should be reviewed for reconciliation.`,
        severity: 'warning',
      })
    }
  }

  return { events, contradictions }
}
