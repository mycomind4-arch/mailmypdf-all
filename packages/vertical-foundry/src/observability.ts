export interface FoundryEvent { runId: string; stage: string; type: string; timestamp: string; metadata?: Record<string, unknown> | undefined }
export interface FoundryEventSink { emit(event: FoundryEvent): Promise<void> }

export async function emitStageEvent(sink: FoundryEventSink, runId: string, stage: string, type: string, metadata?: Record<string, unknown>) {
  await sink.emit({ runId, stage, type, timestamp: new Date().toISOString(), metadata })
}
