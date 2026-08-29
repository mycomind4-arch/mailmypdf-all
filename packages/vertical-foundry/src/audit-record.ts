export interface AuditRecord { runId: string; actor: 'FOUNDRY' | 'HUMAN' | 'PROVIDER'; action: string; outcome: 'ALLOWED' | 'DENIED' | 'FAILED' | 'SUCCEEDED'; timestamp: string; metadata?: Record<string, unknown> }
export interface AuditSink { append(record: AuditRecord): Promise<void> }

export async function audit(sink: AuditSink, record: Omit<AuditRecord, 'timestamp'>) {
  await sink.append({ ...record, timestamp: new Date().toISOString() })
}
