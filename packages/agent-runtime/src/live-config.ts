/**
 * Live integration configuration gate.
 *
 * This intentionally checks configuration only. It never treats the presence
 * of an environment variable as proof that an external service is healthy.
 * A live smoke test must verify each configured service separately.
 */
export interface LiveIntegrationConfig {
  trigger?: { endpoint: string; apiKey: string };
  docling?: { endpoint: string; apiKey?: string };
  model?: { provider: string; apiKey: string };
  mcp?: { endpoint: string };
  fulfillment?: { provider: string; apiKey: string };
  telemetry?: { endpoint: string };
}

export function readLiveIntegrationConfig(env = process.env): LiveIntegrationConfig {
  const get = (name: string) => {
    const candidate = env[name];
    return candidate && candidate.trim() ? candidate.trim() : undefined;
  };
  return {
    trigger: get('TRIGGER_ENDPOINT') && get('TRIGGER_API_KEY') ? { endpoint: get('TRIGGER_ENDPOINT')!, apiKey: get('TRIGGER_API_KEY')! } : undefined,
    docling: get('DOCLING_ENDPOINT') ? { endpoint: get('DOCLING_ENDPOINT')!, ...(get('DOCLING_API_KEY') ? { apiKey: get('DOCLING_API_KEY') } : {}) } : undefined,
    model: get('MODEL_PROVIDER') && get('MODEL_API_KEY') ? { provider: get('MODEL_PROVIDER')!, apiKey: get('MODEL_API_KEY')! } : undefined,
    mcp: get('MCP_ENDPOINT') ? { endpoint: get('MCP_ENDPOINT')! } : undefined,
    fulfillment: get('FULFILLMENT_PROVIDER') && get('FULFILLMENT_API_KEY') ? { provider: get('FULFILLMENT_PROVIDER')!, apiKey: get('FULFILLMENT_API_KEY')! } : undefined,
    telemetry: get('TELEMETRY_ENDPOINT') ? { endpoint: get('TELEMETRY_ENDPOINT')! } : undefined,
  };
}

export interface ConfigurationGate {
  name: string;
  configured: boolean;
}

export function configurationGates(config: LiveIntegrationConfig): ConfigurationGate[] {
  return [
    { name: 'trigger', configured: Boolean(config.trigger) },
    { name: 'docling', configured: Boolean(config.docling) },
    { name: 'model', configured: Boolean(config.model) },
    { name: 'mcp', configured: Boolean(config.mcp) },
    { name: 'fulfillment', configured: Boolean(config.fulfillment) },
    { name: 'telemetry', configured: Boolean(config.telemetry) },
  ];
}

export function configuredIntegrationNames(config: LiveIntegrationConfig): string[] {
  return configurationGates(config).filter((gate) => gate.configured).map((gate) => gate.name);
}
