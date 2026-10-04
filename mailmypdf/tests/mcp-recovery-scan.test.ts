import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { screenProvidedRecoveryTransactions } from '../src/lib/mcp/recovery-scan';
import { getMcpTool, MCP_PROTECTED_TOOL_NAMES } from '../src/lib/mcp/tool-catalog';
import { RECOVERY_SCAN_RESOURCE_URI } from '../src/lib/mcp/ui-resource-ids';

let authenticated = true;
class AuthenticationError extends Error {}
mock.module('../src/lib/secure-core/auth.server.ts', { namedExports: {
  AuthenticationError,
  requireAuthenticatedUser: async () => {
    if (!authenticated) throw new AuthenticationError('Sign in required');
    return { user: { id: 'owner-1' }, supabase: {} };
  },
} });
const { executeMcpTool, McpToolExecutionError } = await import('../src/lib/mcp/workflow-tools.server');
const { handleMailMyPdfMcpRequest } = await import('../src/lib/mcp/mcp-handler.server');
const transaction = (id: string) => ({ id, accountId: 'Checking alias', merchant: 'Merchant', amountMinor: 8900, currency: 'USD', postedAt: '2026-10-01T12:00:00Z', state: 'settled', kind: 'debit' });
const request = (method: string, params: unknown = {}) => new Request('https://mailmypdf.test/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });

test('recovery scan advertises authentication, read-only behavior, and its review card', () => {
  const tool = getMcpTool('scan_recovery_candidates')!;
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.openWorldHint, false);
  assert.equal(MCP_PROTECTED_TOOL_NAMES.has(tool.name), true);
  assert.equal(tool._meta?.['openai/outputTemplate'], RECOVERY_SCAN_RESOURCE_URI);
});
test('authenticated connector tool returns review candidates without invoking external providers', async () => {
  const result = await executeMcpTool(request('tools/call'), 'scan_recovery_candidates', { transactions: [transaction('1'), transaction('2')] }) as ReturnType<typeof screenProvidedRecoveryTransactions>;
  assert.equal(result.scan.candidates.length, 1);
  assert.equal(result.scan.potentialByCurrency.USD, 8900);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.externalActionsAuthorized, false);
  assert.equal(result.dataSource, 'user-provided-transactions');
});
test('missing authentication blocks both direct handler and MCP execution', async () => {
  authenticated = false;
  try {
    await assert.rejects(executeMcpTool(request('tools/call'), 'scan_recovery_candidates', { transactions: [] }), AuthenticationError);
    const response = await handleMailMyPdfMcpRequest(request('tools/call', { name: 'scan_recovery_candidates', arguments: { transactions: [] } }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate')!, /resource_metadata/);
  } finally { authenticated = true; }
});
test('scanner rejects account credentials, duplicate source IDs, invalid amounts and oversized batches', async () => {
  for (const transactions of [[{ ...transaction('1'), accessToken: 'private' }], [transaction('1'), transaction('1')], [{ ...transaction('1'), amountMinor: 1.2 }], Array.from({ length: 2001 }, (_, i) => transaction(String(i)))]) {
    await assert.rejects(executeMcpTool(request('tools/call'), 'scan_recovery_candidates', { transactions }), (error: unknown) => error instanceof McpToolExecutionError && error.status === 400);
  }
  assert.throws(() => screenProvidedRecoveryTransactions({ transactions: [], ownerId: 'another-owner' }), /transactions/);
});
test('portable recovery resource is listed and contains no private transaction values', async () => {
  const listed = await handleMailMyPdfMcpRequest(request('resources/list'));
  const resources = (await listed.json()).result.resources;
  assert.ok(resources.some((item: { uri: string }) => item.uri === RECOVERY_SCAN_RESOURCE_URI));
  const response = await handleMailMyPdfMcpRequest(request('resources/read', { uri: RECOVERY_SCAN_RESOURCE_URI }));
  const contents = (await response.json()).result.contents;
  assert.equal(contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.equal(contents[0]._meta.ui.domain, 'https://mailmypdf.test');
  assert.equal(contents[0].text.includes('Checking alias'), false);
  assert.deepEqual(contents[0]._meta.ui.csp.connectDomains, []);
});
