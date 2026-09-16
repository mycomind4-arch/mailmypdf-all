export type WorkflowTelemetryLevel = "info" | "warn" | "error";

export interface WorkflowTelemetryEvent {
  workflowId: string;
  matterId?: string;
  runId?: string;
  stage: string;
  event: string;
  level: WorkflowTelemetryLevel;
  occurredAt: string;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface WorkflowTelemetrySink {
  emit(event: WorkflowTelemetryEvent): Promise<void> | void;
}

const SENSITIVE_KEY = /(content|document|body|text|prompt|secret|token|password|api.?key|ssn)/i;

export function sanitizeWorkflowTelemetryMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = typeof value === "string" ? value.slice(0, 500) : value;
    }
  }
  return safe;
}

export async function emitWorkflowEvent(
  sink: WorkflowTelemetrySink,
  input: Omit<WorkflowTelemetryEvent, "occurredAt" | "metadata"> & {
    occurredAt?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!input.workflowId.trim() || !input.stage.trim() || !input.event.trim()) {
    throw new Error("Workflow telemetry requires workflowId, stage, and event");
  }
  await sink.emit({
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    metadata: sanitizeWorkflowTelemetryMetadata(input.metadata),
  });
}
