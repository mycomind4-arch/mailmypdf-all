/** Platform-owned telemetry contract for agent, model, tool, approval, and action execution. */
export type TelemetryKind = 'run' | 'task' | 'model' | 'tool' | 'approval' | 'action';
export type TelemetryStatus = 'started' | 'succeeded' | 'failed' | 'blocked' | 'cancelled';

export interface TelemetryEvent {
  id: string;
  traceId: string;
  parentId?: string;
  caseId?: string;
  runId?: string;
  kind: TelemetryKind;
  name: string;
  status: TelemetryStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  attributes?: Record<string, string | number | boolean | null>;
  error?: { code?: string; message: string };
}

export interface TelemetrySink {
  record(event: TelemetryEvent): Promise<void>;
}

export function finishTelemetry(event: TelemetryEvent, status: TelemetryStatus, endedAt: string, error?: TelemetryEvent['error']): TelemetryEvent {
  const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(event.startedAt).getTime());
  return { ...event, status, endedAt, durationMs, ...(error ? { error } : {}) };
}

export function createTraceId(prefix = 'trace'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
