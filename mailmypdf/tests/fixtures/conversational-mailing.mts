/** Local-only MCP host simulator. No credentials, provider calls, payment, or mail. */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PACKET_REVIEW_RESOURCE } from "../../src/lib/mcp/packet-review-resource";

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
pdf.addPage().drawText("MailMyPDF local review fixture - no real mailing", { x: 40, y: 740, size: 14, font });
const bytes = await pdf.save();
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sender = { name: "Example Consulting", line1: "123 Example St", city: "Austin", state: "TX", postal: "78701" };
const recipient = { name: "Sarah - Example Legal", line1: "456 Example Ave", line2: "Suite 200", city: "Dallas", state: "TX", postal: "75201" };
const verified = { status: "verified", ready: true, message: "Postal deliverability verified; recipient identity is not verified." };
const payload = {
  draft: { id: "fixture-order", readyForApproval: true, document: { name: "example-letter.pdf", sha256, pageCount: 1 },
    sender, recipient, cost: { totalCents: 842 }, color: false, mailingMethod: "certified",
    addressVerification: { sender: verified, recipient: verified },
    deliveryExpectation: "No delivery date is guaranteed. Tracking appears after submission." },
  packet: { packetSha256: sha256, quote: { totalCents: 842 }, responsePages: 1, supportingPages: 0 },
  review: { kind: "direct", mailClass: "certified", previewResourceUri: `mailmypdf://direct-pdf/fixture-order?sha256=${sha256}` },
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:4198");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  if (url.pathname === "/review") return response.end(PACKET_REVIEW_RESOURCE.text);
  if (url.pathname !== "/") { response.statusCode = 404; return response.end("Not found"); }
  const data = structuredClone(payload);
  const blocked = url.searchParams.get("scenario") === "blocked";
  data.draft.readyForApproval = !blocked;
  if (blocked) data.draft.addressVerification.recipient = { status: "unavailable", ready: false, message: "Address verification is unavailable. Retry review before approval." };
  response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local conversational mailing QA</title></head>
  <body style="font-family:system-ui;margin:12px"><h1>Test mailing only</h1><p>No payment or mail will be created. Price and addresses are fictional.</p>
  <iframe id="review" title="Mailing review card" src="/review" style="width:100%;height:2200px;border:0"></iframe><pre id="events"></pre>
  <script>
  const data = ${JSON.stringify(data)};
  const frame = document.getElementById('review');
  window.addEventListener('message', event => {
    if(event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const m = event.data;
    if(!m || !m.id || !m.method) return;
    let result = {};
    if(m.method === 'resources/read') result = {contents:[{uri:data.review.previewResourceUri,mimeType:'application/pdf',blob:${JSON.stringify(Buffer.from(bytes).toString('base64'))}}]};
    if(m.method === 'tools/call') {
      document.getElementById('events').textContent = 'Tool requested: ' + m.params.name + ' (simulated)';
      result = {isError:${JSON.stringify(url.searchParams.get('scenario') === 'approval-error')},structuredContent:{approval:{approved:true,orderId:data.draft.id,packetSha256:data.draft.document.sha256,totalCents:data.draft.cost.totalCents}}};
    }
    frame.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result},location.origin);
    if(m.method === 'ui/initialize') frame.contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data,isError:false}},location.origin);
  });
  </script></body></html>`);
}).listen(4198, "127.0.0.1", () => console.log("Mailing QA fixture: http://127.0.0.1:4198"));
