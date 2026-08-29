export type LiveService = 'trigger' | 'docling' | 'model' | 'mcp' | 'fulfillment' | 'telemetry';
export type LiveStatus = 'pass' | 'fail' | 'unconfigured' | 'skipped';

export interface LiveCheck {
  service: LiveService;
  status: LiveStatus;
  latencyMs?: number;
  message?: string;
}

export interface LiveSmokeResult {
  checkedAt: string;
  checks: LiveCheck[];
  green: boolean;
}

export interface HealthProbe {
  service: LiveService;
  probe(): Promise<{ ok: boolean; message?: string }>;
}

export async function runLiveSmoke(probes: readonly HealthProbe[], now = new Date().toISOString()): Promise<LiveSmokeResult> {
  const checks: LiveCheck[] = [];
  for (const probe of probes) {
    const started = Date.now();
    try {
      const result = await probe.probe();
      checks.push({ service: probe.service, status: result.ok ? 'pass' : 'fail', latencyMs: Date.now() - started, message: result.message });
    } catch (error) {
      checks.push({ service: probe.service, status: 'fail', latencyMs: Date.now() - started, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { checkedAt: now, checks, green: checks.length > 0 && checks.every((check) => check.status === 'pass') };
}
