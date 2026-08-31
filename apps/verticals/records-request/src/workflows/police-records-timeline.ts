export type PoliceTimelineEventType =
  | 'incident'
  | 'dispatch'
  | 'arrest'
  | 'booking'
  | '911'
  | 'report'
  | 'supplement'
  | 'interview'
  | 'photograph'
  | 'video'
  | 'correspondence'
  | 'other'

export type PoliceTimelineEvent = {
  id: string
  type: PoliceTimelineEventType
  date?: string
  sourceRecordIds: string[]
  description: string
  certainty: 'documented' | 'unknown'
}

export type PoliceTimelineContradiction = {
  id: string
  eventIds: string[]
  description: string
  severity: 'warning' | 'critical'
}

export type PoliceRecordsTimeline = {
  events: PoliceTimelineEvent[]
  contradictions: PoliceTimelineContradiction[]
}

const DATE_PATTERN = /\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)(?:\s+(\d{1,2}):([0-5]\d)(?:\s*([AP]M))?)?\b/g
const TYPE_PATTERNS: Array<[PoliceTimelineEventType, RegExp]> = [
  ['dispatch', /CAD|dispatch|call[- ]for[- ]service/i],
  ['911', /911|emergency call/i],
  ['arrest', /arrested|arrest report|arrest/i],
  ['booking', /booking|booked into jail/i],
  ['incident', /incident report|incident/i],
  ['report', /police report|offense report|report number/i],
  ['supplement', /supplemental report|supplement/i],
  ['interview', /interview|witness statement|victim statement/i],
  ['photograph', /photograph|photo/i],
  ['video', /body[- ]?cam|dash[- ]?cam|video|recording/i],
  ['correspondence', /email|letter|correspondence/i],
]

function normalizeDate(match: RegExpMatchArray): string {
  const [, year, month, day, hour, minute, meridiem] = match
  if (!hour || !minute) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  let h = Number(hour)
  if (meridiem) {
    const upper = meridiem.toUpperCase()
    if (upper === 'PM' && h < 12) h += 12
    if (upper === 'AM' && h === 12) h = 0
  }
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(h).padStart(2, '0')}:${minute}`
}

export function buildPoliceRecordsTimeline(records: readonly PoliceTimelineRecordInput[]): PoliceRecordsTimeline {
  const events: PoliceTimelineEvent[] = []
  for (const record of records) {
    const text = `${record.filename} ${record.category ?? ''} ${record.text ?? ''}`
    const dates = [...text.matchAll(DATE_PATTERN)]
    const match = TYPE_PATTERNS.find(([, pattern]) => pattern.test(text))
    if (!match) continue
    events.push({
      id: `event-${record.id}`,
      type: match[0],
      date: dates[0] ? normalizeDate(dates[0]) : undefined,
      sourceRecordIds: [record.id],
      description: (record.text ?? record.filename).slice(0, 500),
      certainty: dates[0] ? 'documented' : 'unknown',
    })
  }

  const contradictions: PoliceTimelineContradiction[] = []
  const byType = new Map<PoliceTimelineEventType, PoliceTimelineEvent[]>()
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

export type PoliceTimelineRecordInput = {
  id: string
  filename: string
  category?: string
  text?: string
}
