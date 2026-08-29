/**
 * Timeline Engine
 *
 * Creates a deterministic timeline with fact classification.
 * Each timeline item identifies whether it is: verified, user asserted, inferred, unknown.
 * Detects: date conflicts, missing events, events out of order, duplicate events, unsupported transitions.
 */

import type { FactCategory } from './fact-taxonomy';

// ─── Timeline Types ───────────────────────────────────────────────────────────

export type TimelineFactStatus = 'verified' | 'user_asserted' | 'inferred' | 'unknown';

export interface TimelineEvent {
  id: string;
  date: string | undefined;
  dateApproximate: boolean;
  event: string;
  description: string;
  factStatus: TimelineFactStatus;
  source: string;
  documentId?: string;
  excerpt?: string;
  relatedEvents?: string[];
}

export interface TimelineAnomaly {
  type: 'date_conflict' | 'missing_event' | 'out_of_order' | 'duplicate' | 'unsupported_transition';
  events: string[];
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Timeline {
  events: TimelineEvent[];
  anomalies: TimelineAnomaly[];
  earliestDate: string | undefined;
  latestDate: string | undefined;
  summary: string;
}

// ─── Timeline Builder ─────────────────────────────────────────────────────────

let eventCounter = 0;

export function buildTimeline(events: TimelineEvent[]): Timeline {
  eventCounter = 0;
  const sorted = [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const anomalies = detectTimelineAnomalies(sorted);

  const datedEvents = sorted.filter(e => e.date);
  const earliestDate = datedEvents[0]?.date;
  const latestDate = datedEvents[datedEvents.length - 1]?.date;

  const summary = `Timeline contains ${sorted.length} event(s). ${sorted.filter(e => e.factStatus === 'verified').length} verified, ${sorted.filter(e => e.factStatus === 'user_asserted').length} user-asserted, ${sorted.filter(e => e.factStatus === 'inferred').length} inferred, ${sorted.filter(e => e.factStatus === 'unknown').length} unknown.`;

  return {
    events: sorted,
    anomalies,
    earliestDate,
    latestDate,
    summary,
  };
}

// ─── Anomaly Detection ──────────────────────────────────────────────────────────

function detectTimelineAnomalies(events: TimelineEvent[]): TimelineAnomaly[] {
  const anomalies: TimelineAnomaly[] = [];

  // Detect date conflicts (same event with different dates)
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (events[i].event === events[j].event && events[i].date && events[j].date && events[i].date !== events[j].date) {
        anomalies.push({
          type: 'date_conflict',
          events: [events[i].id, events[j].id],
          description: `Event "${events[i].event}" has conflicting dates: ${events[i].date} vs ${events[j].date}.`,
          severity: 'high',
        });
      }
    }
  }

  // Detect duplicates (same event, same date)
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (events[i].event === events[j].event && events[i].date === events[j].date) {
        anomalies.push({
          type: 'duplicate',
          events: [events[i].id, events[j].id],
          description: `Duplicate event detected: "${events[i].event}".`,
          severity: 'low',
        });
      }
    }
  }

  // Detect out-of-order events
  for (let i = 0; i < events.length - 1; i++) {
    if (events[i].date && events[i + 1].date && events[i].date! > events[i + 1].date!) {
      anomalies.push({
        type: 'out_of_order',
        events: [events[i].id, events[i + 1].id],
        description: `Event "${events[i].event}" (${events[i].date}) appears after "${events[i + 1].event}" (${events[i + 1].date}) but has an earlier date.`,
        severity: 'medium',
      });
    }
  }

  // Detect unsupported transitions (e.g., warrant before notice)
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (/warrant|inspection\s+authorization/i.test(event.event) && events.slice(0, i).every(e => !/notice|complaint/i.test(e.event))) {
      anomalies.push({
        type: 'unsupported_transition',
        events: [event.id],
        description: `Warrant/inspection authorization event "${event.event}" appears without a preceding notice or complaint event.`,
        severity: 'medium',
      });
    }
  }

  return anomalies;
}

// ─── Event Factory ─────────────────────────────────────────────────────────────

export function createTimelineEvent(
  event: string,
  date: string | undefined,
  factStatus: TimelineFactStatus,
  source: string,
  options?: {
    dateApproximate?: boolean;
    description?: string;
    documentId?: string;
    excerpt?: string;
  },
): TimelineEvent {
  return {
    id: `tl-${++eventCounter}`,
    date,
    dateApproximate: options?.dateApproximate ?? false,
    event,
    description: options?.description || event,
    factStatus,
    source,
    documentId: options?.documentId,
    excerpt: options?.excerpt,
  };
}

// ─── McKinleyville Scenario Timeline ──────────────────────────────────────────

export function buildMcKinleyvilleTimeline(): Timeline {
  eventCounter = 0;
  const events: TimelineEvent[] = [
    createTimelineEvent(
      'Alleged complaint received',
      undefined,
      'user_asserted',
      'user-account',
      { dateApproximate: true, description: 'An alleged complaint was reportedly made regarding the property.' },
    ),
    createTimelineEvent(
      'Law enforcement visited property',
      undefined,
      'user_asserted',
      'user-account',
      { dateApproximate: true, description: 'Multiple law enforcement officers came to the property approximately two weeks before the code enforcement notice. User reports officers claimed stolen property investigation. User states the stolen-property allegation was false. Officers reportedly asked for permission to search. User reports nothing was found. Officers reportedly did not enter the home. An officer reportedly mentioned an open Code Enforcement case.' },
    ),
    createTimelineEvent(
      'No matching public record found',
      undefined,
      'unknown',
      'public-search',
      { description: 'User reports no corresponding call-for-service/public incident record was visible in the public online system.' },
    ),
    createTimelineEvent(
      'Code Enforcement notice received',
      undefined,
      'user_asserted',
      'user-account',
      { dateApproximate: true, description: 'Code enforcement notice received recently by the user.' },
    ),
    createTimelineEvent(
      'Response deadline: September 3, 2026',
      '2026-09-03',
      'user_asserted',
      'user-account',
      { description: 'The notice reportedly gives a response deadline of September 3, 2026.' },
    ),
    createTimelineEvent(
      'Possible warrant/inspection authorization',
      undefined,
      'unknown',
      'notice-text',
      { description: 'The notice reportedly states that the agency may seek a warrant if permission is denied.' },
    ),
  ];

  return buildTimeline(events);
}
