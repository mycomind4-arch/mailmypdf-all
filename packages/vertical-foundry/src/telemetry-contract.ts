export interface FoundryTelemetry { runId: string; verticalId: string; stage: string; durationMs?: number; status: 'STARTED' | 'SUCCEEDED' | 'FAILED'; metadata?: Record<string, unknown> }
export interface TelemetryProvider { record(event: FoundryTelemetry): Promise<void> }
