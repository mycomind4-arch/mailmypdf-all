import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createD1RequestRepository, type D1DatabaseLike, type RequestStateRepository } from './request-repository'

const runtimeKey = '__MAILMYPDF_RECORDS_D1__'

type RuntimeGlobal = typeof globalThis & {
  [runtimeKey]?: D1DatabaseLike
}

type RecordsCloudflareEnv = {
  RECORDS_DB?: D1DatabaseLike
}

export function getD1RequestDatabase(): D1DatabaseLike | null {
  return (globalThis as RuntimeGlobal)[runtimeKey] ?? null
}

export function getRequestStateRepository(): RequestStateRepository | null {
  const db = getD1RequestDatabase()
  return db ? createD1RequestRepository(db) : null
}

export async function getRequestStateRepositoryAsync(): Promise<RequestStateRepository | null> {
  const existing = getRequestStateRepository()
  if (existing) return existing

  const context = await getCloudflareContext({ async: true })
  const db = (context.env as RecordsCloudflareEnv).RECORDS_DB
  if (!db) return null
  installD1RequestDatabase(db)
  return createD1RequestRepository(db)
}

export function installD1RequestDatabase(db: D1DatabaseLike): void {
  ;(globalThis as RuntimeGlobal)[runtimeKey] = db
}
