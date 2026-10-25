import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { RECOVERY_SCAN_RESOURCE } from '../src/lib/mcp/recovery-scan-resource';

class Element {
  children: Element[] = []; textContent = ''; className = '';
  constructor(readonly tag: string) {}
  appendChild(element: Element) { this.children.push(element); }
  replaceChildren() { this.children = []; }
  text(): string { return this.textContent + this.children.map((child) => child.text()).join(' '); }
}
function render(output: unknown) {
  const totals = new Element('div'), candidates = new Element('div');
  let receive!: (event: unknown) => void;
  let globals!: (event: unknown) => void;
  const messages: unknown[] = [];
  const window = { openai: { toolOutput: output }, parent: { postMessage(message: unknown) { messages.push(message); } }, addEventListener(name: string, callback: typeof receive) { if (name === 'message') receive = callback; if (name === 'openai:set_globals') globals = callback; } };
  const document = { createElement: (tag: string) => new Element(tag), getElementById: (id: string) => id === 'totals' ? totals : candidates };
  const script = RECOVERY_SCAN_RESOURCE.text.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  vm.runInNewContext(script, { window, document, Intl, console });
  return { totals, candidates, messages, globals(toolOutput: unknown) { globals({ detail: { globals: { toolOutput } } }); }, notify(params: unknown, source = window.parent) { receive({ source, data: { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params } }); } };
}
const output = () => ({ scan: { potentialByCurrency: { USD: 8900, JPY: 500 }, candidates: [{ merchant: '<img src=x onerror=attack()>', amountMinor: 8900, currency: 'USD', confidence: 'needs-review', accountId: 'Checking', transactionIds: ['one', 'two'], reason: 'Two matching charges', nextStep: 'Review invoices first.' }] } });
test('recovery card renders exact currency minor units and untrusted text without HTML injection', () => {
  const result = render(output());
  assert.match(result.totals.text(), /\$89\.00/);
  assert.match(result.totals.text(), /500/);
  assert.match(result.candidates.text(), /<img src=x onerror=attack\(\)>/);
  assert.equal(result.candidates.children[0]?.tag, 'article');
  assert.equal(result.messages.length, 1);
  assert.equal((result.messages[0] as { method: string }).method, 'ui/initialize');
});
test('recovery card responds only to the parent host and clears failed or stale results', () => {
  const result = render(output());
  result.notify({ isError: false, structuredContent: { scan: { candidates: [], potentialByCurrency: {} } } }, {} as never);
  assert.match(result.candidates.text(), /Two matching charges/);
  result.notify({ isError: false, structuredContent: { scan: { candidates: [], potentialByCurrency: {} } } });
  assert.match(result.candidates.text(), /No possible duplicate/);
  result.notify({ isError: true, structuredContent: output() });
  assert.equal(result.totals.children.length, 0);
  assert.match(result.candidates.text(), /Waiting/);
  result.globals(output());
  assert.match(result.candidates.text(), /Two matching charges/);
  result.globals(null);
  assert.equal(result.totals.children.length, 0);
  assert.match(result.candidates.text(), /Waiting/);
});
test('recovery card has no execution, payment, external fetch, or approval controls', () => {
  assert.equal(RECOVERY_SCAN_RESOURCE.text.includes('tools/call'), false);
  assert.equal(RECOVERY_SCAN_RESOURCE.text.includes('innerHTML'), false);
  assert.equal(RECOVERY_SCAN_RESOURCE.text.includes('fetch('), false);
  assert.deepEqual(RECOVERY_SCAN_RESOURCE._meta.ui.csp.connectDomains, []);
});
