import type { HealthProbe, LiveService } from './live-smoke.js';

export interface HttpProbeOptions {
  service: LiveService;
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function httpHealthProbe(options: HttpProbeOptions): HealthProbe {
  return {
    service: options.service,
    async probe() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
      try {
        const response = await fetch(options.url, { method: 'GET', headers: options.headers, signal: controller.signal });
        return { ok: response.ok, message: `${response.status} ${response.statusText}`.trim() };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function buildConfiguredProbes(config: {
  trigger?: { endpoint: string; apiKey: string };
  docling?: { endpoint: string; apiKey?: string };
  model?: { provider: string; apiKey: string; healthEndpoint?: string };
  mcp?: { endpoint: string };
  fulfillment?: { provider: string; apiKey: string; healthEndpoint?: string };
  telemetry?: { endpoint: string };
}): HealthProbe[] {
  const probes: HealthProbe[] = [];
  if (config.trigger) probes.push(httpHealthProbe({ service: 'trigger', url: config.trigger.endpoint, headers: { Authorization: `Bearer ${config.trigger.apiKey}` } }));
  if (config.docling) probes.push(httpHealthProbe({ service: 'docling', url: config.docling.endpoint, ...(config.docling.apiKey ? { headers: { Authorization: `Bearer ${config.docling.apiKey}` } } : {}) }));
  if (config.model?.healthEndpoint) probes.push(httpHealthProbe({ service: 'model', url: config.model.healthEndpoint, headers: { Authorization: `Bearer ${config.model.apiKey}` } }));
  if (config.mcp) probes.push(httpHealthProbe({ service: 'mcp', url: config.mcp.endpoint }));
  if (config.fulfillment?.healthEndpoint) probes.push(httpHealthProbe({ service: 'fulfillment', url: config.fulfillment.healthEndpoint, headers: { Authorization: `Bearer ${config.fulfillment.apiKey}` } }));
  if (config.telemetry) probes.push(httpHealthProbe({ service: 'telemetry', url: config.telemetry.endpoint }));
  return probes;
}
