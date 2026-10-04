import { RECOVERY_SCAN_RESOURCE_URI } from './ui-resource-ids';

export const RECOVERY_SCAN_RESOURCE = {
  uri: RECOVERY_SCAN_RESOURCE_URI,
  name: 'mailmypdf-recovery-scan',
  title: 'MailMyPDF recovery review',
  description: 'Review possible duplicate charges and their evidence before choosing a resolution workflow.',
  mimeType: 'text/html;profile=mcp-app',
  text: String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MailMyPDF recovery review</title>
<style>
:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;padding:16px;background:transparent;color:CanvasText}
main{border:1px solid color-mix(in srgb,CanvasText 16%,transparent);border-radius:18px;padding:24px;background:Canvas;max-width:760px;margin:auto}
.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;opacity:.65}h1{font-size:24px;margin:8px 0}p{font-size:14px;line-height:1.5;opacity:.8}
.totals{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.total{border-radius:12px;padding:14px 18px;background:color-mix(in srgb,#21846c 12%,Canvas)}.amount{font-size:26px;font-weight:700;display:block}.caption{font-size:11px;opacity:.7}
article{border-top:1px solid color-mix(in srgb,CanvasText 12%,transparent);padding:18px 0}.row{display:flex;gap:10px;align-items:baseline;justify-content:space-between}h2{font-size:16px;margin:0;overflow-wrap:anywhere}.value{font-weight:700;white-space:nowrap}.badge{display:inline-block;border-radius:999px;font-size:11px;padding:4px 8px;background:color-mix(in srgb,#ba7916 12%,Canvas);margin-top:9px}
details{font-size:13px;margin-top:12px}summary{cursor:pointer}ul{padding-left:20px;line-height:1.7;overflow-wrap:anywhere}.notice{padding:13px;border-radius:12px;background:color-mix(in srgb,CanvasText 5%,transparent);font-size:12px;line-height:1.6;margin-top:20px}.empty{padding:20px 0}footer{font-size:11px;opacity:.65;margin-top:18px}
@media(max-width:420px){main{padding:16px}.row{align-items:flex-start}h1{font-size:21px}.amount{font-size:23px}}
</style></head><body><main aria-live="polite">
<div class="eyebrow">MailMyPDF · Recovery review</div><h1>Possible money to recover</h1>
<p>Review the evidence first. Similar charges can also be separate purchases.</p>
<div id="totals" class="totals"></div><div id="candidates"><p class="empty">Waiting for your transaction scan.</p></div>
<div class="notice">This scan does not confirm money owed. No accounts were accessed, no disputes were sent, and no payment was taken.</div>
<footer>Transaction data supplied by you. Amounts stay separate by currency.</footer>
</main><script>
(() => {
  let output = window.openai && window.openai.toolOutput;
  const node = (tag, text, className) => { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; };
  const money = (minor, currency) => {
    try { const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency }); const decimals = formatter.resolvedOptions().maximumFractionDigits; return formatter.format(minor / Math.pow(10, decimals)); }
    catch { return String(minor) + ' minor units ' + currency; }
  };
  function render() {
    const totals = document.getElementById('totals'); const list = document.getElementById('candidates');
    totals.replaceChildren(); list.replaceChildren();
    const scan = output && output.scan;
    if (!scan || !Array.isArray(scan.candidates)) { list.appendChild(node('p', 'Waiting for your transaction scan.', 'empty')); return; }
    for (const [currency, minor] of Object.entries(scan.potentialByCurrency || {})) {
      if (!Number.isSafeInteger(minor) || minor < 0) continue;
      const tile = node('div', undefined, 'total'); tile.appendChild(node('span', money(minor, currency), 'amount')); tile.appendChild(node('span', 'Potential candidate value · ' + currency, 'caption')); totals.appendChild(tile);
    }
    if (!scan.candidates.length) list.appendChild(node('p', 'No possible duplicate charges matched these records. Other billing issues may still need review.', 'empty'));
    for (const item of scan.candidates.slice(0, 100)) {
      const card = node('article'); const row = node('div', undefined, 'row');
      row.appendChild(node('h2', String(item.merchant || 'Merchant'))); row.appendChild(node('span', money(item.amountMinor, item.currency), 'value')); card.appendChild(row);
      card.appendChild(node('span', item.confidence === 'strong-evidence' ? 'Matching verified invoice · review required' : 'Possible duplicate · needs review', 'badge'));
      card.appendChild(node('p', String(item.reason || 'Review the original evidence.')));
      const details = node('details'); details.appendChild(node('summary', 'Review transaction evidence')); const sources = node('ul');
      sources.appendChild(node('li', 'Source account: ' + String(item.accountId || 'Unknown')));
      for (const id of Array.isArray(item.transactionIds) ? item.transactionIds : []) sources.appendChild(node('li', 'Transaction: ' + String(id)));
      details.appendChild(sources); details.appendChild(node('p', String(item.nextStep || 'Review invoices and refunds before starting a case.'))); card.appendChild(details); list.appendChild(card);
    }
    if (scan.candidates.length > 100) list.appendChild(node('p', 'Showing the first 100 candidates. The complete result is available in the conversation.'));
  }
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !event.data || event.data.jsonrpc !== '2.0') return;
    if (event.data.method === 'ui/notifications/tool-result') { const result = event.data.params; output = result && !result.isError ? result.structuredContent : null; render(); }
    if (event.data.id === 1 && event.data.result) window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized' }, '*');
  });
  window.addEventListener('openai:set_globals', (event) => { const globals = event.detail && event.detail.globals; if (globals && Object.prototype.hasOwnProperty.call(globals, 'toolOutput')) { output = globals.toolOutput; render(); } });
  render();
  window.parent.postMessage({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: { protocolVersion: '2026-01-26', appInfo: { name: 'MailMyPDF recovery review', version: '1.0.0' }, appCapabilities: {} } }, '*');
})();
</script></body></html>`,
  _meta: {
    ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } },
    'openai/widgetDescription': 'Review possible duplicate charges, original transaction ids, and evidence requirements. Does not send or approve disputes.',
    'openai/widgetPrefersBorder': true,
  },
} as const;
