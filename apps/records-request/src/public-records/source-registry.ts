import { PublicRecordsSource } from './source-adapter'

const SOURCES: PublicRecordsSource[] = []

export function registerPublicRecordsSource(source: PublicRecordsSource): void {
  if (SOURCES.some((candidate) => candidate.id === source.id)) throw new Error(`PUBLIC_RECORDS_SOURCE_ALREADY_REGISTERED:${source.id}`)
  SOURCES.push(Object.freeze({ ...source }))
}

export function listPublicRecordsSources(filters?: { jurisdiction?: string; agency?: string }): PublicRecordsSource[] {
  return SOURCES.filter((source) =>
    (!filters?.jurisdiction || source.jurisdiction === filters.jurisdiction) &&
    (!filters?.agency || source.agency === filters.agency),
  ).map((source) => ({ ...source }))
}

export function getPublicRecordsSource(id: string): PublicRecordsSource | undefined {
  const source = SOURCES.find((candidate) => candidate.id === id)
  return source ? { ...source } : undefined
}
