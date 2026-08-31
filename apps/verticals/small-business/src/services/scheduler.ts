/**
 * Scheduling primitives for MailMyPDF Business.
 *
 * This is intentionally provider-neutral. A production adapter can persist
 * ScheduleRun records in Postgres/Supabase and execute them with Trigger.dev,
 * Cloudflare Queues, or another durable worker without changing the domain.
 */

import type { Schedule, Trigger } from '../domain/models'

export interface ScheduleRun {
  id: string
  scheduleId: string
  scheduledFor: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  idempotencyKey: string
  startedAt?: string
  completedAt?: string
  error?: string
}

export function nextOccurrence(trigger: Trigger, from = new Date()): Date | null {
  if (trigger.type === 'date' && trigger.at) {
    const date = new Date(trigger.at)
    return date > from ? date : null
  }

  if (trigger.type === 'recurring' && trigger.rrule) {
    return nextFromSimpleRRule(trigger.rrule, from)
  }

  return null
}

/** Supports the recurring rules the SMB MVP needs without coupling the domain to a cron library. */
function nextFromSimpleRRule(rrule: string, from: Date): Date | null {
  const parts = Object.fromEntries(
    rrule.split(';').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    }),
  ) as Record<string, string>

  const frequency = parts.FREQ?.toUpperCase()
  const interval = Math.max(1, Number(parts.INTERVAL ?? 1))
  const candidate = new Date(from)
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  if (frequency === 'DAILY') {
    candidate.setDate(candidate.getDate() + (interval - 1))
    return candidate
  }

  if (frequency === 'WEEKLY') {
    const weekdays = (parts.BYDAY ?? '').split(',').filter(Boolean)
    if (!weekdays.length) {
      candidate.setDate(candidate.getDate() + 7 * (interval - 1))
      return candidate
    }
    const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
    for (let offset = 0; offset <= 7 * interval; offset += 1) {
      const probe = new Date(candidate)
      probe.setDate(probe.getDate() + offset)
      if (weekdays.includes(Object.keys(map).find((key) => map[key] === probe.getDay()) ?? '')) return probe
    }
  }

  if (frequency === 'MONTHLY') {
    const day = Number(parts.BYMONTHDAY ?? from.getDate())
    candidate.setMonth(candidate.getMonth() + 1)
    candidate.setDate(Math.min(day, daysInMonth(candidate.getFullYear(), candidate.getMonth())))
    return candidate
  }

  return null
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function buildScheduleRun(schedule: Schedule, scheduledFor: Date): ScheduleRun {
  const timestamp = scheduledFor.toISOString()
  return {
    id: crypto.randomUUID(),
    scheduleId: schedule.id,
    scheduledFor: timestamp,
    status: 'pending',
    idempotencyKey: `${schedule.id}:${timestamp}`,
  }
}

export function isDue(run: ScheduleRun, now = new Date()) {
  return run.status === 'pending' && new Date(run.scheduledFor).getTime() <= now.getTime()
}
