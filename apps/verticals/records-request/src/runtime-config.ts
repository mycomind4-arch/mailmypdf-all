export type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>
      first<T = unknown>(): Promise<T | null>
      all<T = unknown>(): Promise<{ results: T[] }>
    }
  }
}

export type RecordsRuntimeConfig = {
  db?: D1DatabaseLike
  fulfillmentConfigured: boolean
}

export function getRecordsRuntimeConfig(env: Record<string, unknown> = {}): RecordsRuntimeConfig {
  const db = env.RECORDS_DB as D1DatabaseLike | undefined
  return {
    db,
    fulfillmentConfigured: env.MAILMYPDF_FULFILLMENT_ENABLED === 'true',
  }
}

export function requireDatabase(config: RecordsRuntimeConfig): D1DatabaseLike {
  if (!config.db) throw new Error('records_database_not_configured')
  return config.db
}
