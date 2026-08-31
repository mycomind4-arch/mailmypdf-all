export interface WorkflowProvider {
  schedule(input: {
    workflowId: string;
    taskId: string;
    payload: Record<string, unknown>;
    executeAt?: string;
    cron?: string;
    timezone?: string;
  }): Promise<{ id: string }>;

  cancel(workflowId: string): Promise<void>;
}

/**
 * Temporal stays behind this interface until durable workflow complexity
 * justifies adopting a Temporal worker. Trigger.dev is the default runtime.
 */
export class TemporalHttpProvider implements WorkflowProvider {
  constructor(private readonly options: { baseUrl: string; apiKey?: string }) {}

  async schedule(input: Parameters<WorkflowProvider["schedule"]>[0]) {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/workflows`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Temporal provider request failed: ${response.status}`);
    return (await response.json()) as { id: string };
  }

  async cancel(workflowId: string) {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/workflows/${encodeURIComponent(workflowId)}`, {
      method: "DELETE",
      headers: this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : undefined,
    });
    if (!response.ok && response.status !== 404) throw new Error(`Temporal cancellation failed: ${response.status}`);
  }
}
