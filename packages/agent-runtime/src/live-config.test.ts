import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationGates, readLiveIntegrationConfig } from './live-config.js';

test('configuration gate reports configured integrations without claiming health', () => {
  const config = readLiveIntegrationConfig({
    TRIGGER_ENDPOINT: 'https://trigger.example', TRIGGER_API_KEY: 'secret',
    DOCLING_ENDPOINT: 'https://docling.example',
    MODEL_PROVIDER: 'provider', MODEL_API_KEY: 'secret',
    MCP_ENDPOINT: 'https://mcp.example',
    FULFILLMENT_PROVIDER: 'mail', FULFILLMENT_API_KEY: 'secret',
    TELEMETRY_ENDPOINT: 'https://otel.example',
  });
  assert.deepEqual(configurationGates(config).map((x) => x.configured), [true, true, true, true, true, true]);
});

test('partial configuration stays explicitly partial', () => {
  const config = readLiveIntegrationConfig({ TRIGGER_ENDPOINT: 'https://trigger.example' });
  assert.equal(configurationGates(config).find((x) => x.name === 'trigger')?.configured, false);
});
