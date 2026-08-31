export interface PersistedSchedule {
  id: string
  title: string
  recipient: string
  meta: string
  status: 'Scheduled' | 'Approval required' | 'Draft'
  at: string
  mailClass: 'standard' | 'certified' | 'registered'
}

const KEY = 'mailmypdf-business:schedules:v1'

export function loadSchedules(fallback: PersistedSchedule[]): PersistedSchedule[] {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(KEY)
    if (!value) return fallback
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as PersistedSchedule[]) : fallback
  } catch {
    return fallback
  }
}

export function saveSchedules(value: PersistedSchedule[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(value))
}
