export interface ProviderEvent { runId: string; provider: string; capability: string; outcome: 'STARTED' | 'SUCCEEDED' | 'FAILED'; timestamp: string; }
export interface ProviderEventSink { emit(event: ProviderEvent): Promise<void> }
export async function emitProviderEvent(sink: ProviderEventSink, event: Omit<ProviderEvent, 'timestamp'>) {
  await sink.emit({ ...event, timestamp: new Date().toISOString() })
}
