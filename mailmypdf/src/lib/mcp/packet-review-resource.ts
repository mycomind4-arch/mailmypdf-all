import { PACKET_REVIEW_RESOURCE_URI } from "./ui-resource-ids";

export const PACKET_REVIEW_RESOURCE = {
  uri: PACKET_REVIEW_RESOURCE_URI,
  name: "mailmypdf-packet-review",
  title: "MailMyPDF mailing review",
  description:
    "Review the exact packet identity, recipient, mail class, page count, and quoted price before approval.",
  mimeType: "text/html;profile=mcp-app",
  text: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>MailMyPDF mailing review</title>
<style>
:root {
  color-scheme: light dark;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 16px;
  background: transparent;
  color: CanvasText;
}
.card {
  border: 1px solid color-mix(in srgb, CanvasText 16%, transparent);
  border-radius: 16px;
  padding: 18px;
  background: Canvas;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .62;
}
h1 {
  font-size: 20px;
  line-height: 1.25;
  margin: 6px 0 4px;
}
.subtle { opacity: .7; font-size: 13px; line-height: 1.5; }
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.item {
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  border-radius: 12px;
  padding: 12px;
}
.label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .09em;
  opacity: .58;
}
.value {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.address {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px;
  background: color-mix(in srgb, CanvasText 5%, transparent);
  line-height: 1.45;
  font-size: 14px;
}
.hash {
  margin-top: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  opacity: .68;
}
.notice {
  margin-top: 14px;
  border-radius: 12px;
  padding: 12px;
  background: color-mix(in srgb, #d97706 12%, transparent);
  font-size: 12px;
  line-height: 1.5;
}
.error {
  color: #b91c1c;
  font-size: 13px;
  margin-top: 12px;
}
@media (max-width: 460px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<section class="card" aria-live="polite">
  <div class="eyebrow">MailMyPDF · Review</div>
  <h1>Review before approval</h1>
  <div id="status" class="subtle">Preparing the exact mailing details…</div>
  <div id="content" hidden>
    <div class="grid">
      <div class="item">
        <div class="label">Total price</div>
        <div id="price" class="value">—</div>
      </div>
      <div class="item">
        <div class="label">Mail class</div>
        <div id="mailClass" class="value">—</div>
      </div>
      <div class="item">
        <div class="label">Response pages</div>
        <div id="responsePages" class="value">—</div>
      </div>
      <div class="item">
        <div class="label">Supporting pages</div>
        <div id="supportingPages" class="value">—</div>
      </div>
    </div>
    <div class="address">
      <div class="label">Recipient shown for this review</div>
      <div id="recipient" class="value"></div>
    </div>
    <div class="hash">
      <div><strong>Packet SHA-256:</strong> <span id="packetHash"></span></div>
      <div><strong>Recipient SHA-256:</strong> <span id="recipientHash"></span></div>
    </div>
    <div class="notice">
      This is a review only. No payment has been taken and nothing has been mailed.
      Approval is a separate MailMyPDF action, and the recipient, packet hash, price,
      and mail class must still match this review.
    </div>
  </div>
  <div id="error" class="error" hidden></div>
</section>
<script>
(() => {
  const APP_PROTOCOL = "2026-01-26";
  let requestId = 1;
  let toolInput = null;
  let toolResult = null;
  const pending = new Map();

  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    byId(id).textContent = value == null ? "—" : String(value);
  };

  function post(message) {
    window.parent.postMessage(message, "*");
  }

  function request(method, params) {
    const id = requestId++;
    post({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function notify(method, params) {
    post({ jsonrpc: "2.0", method, ...(params ? { params } : {}) });
  }

  function money(cents) {
    if (!Number.isFinite(cents)) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }

  function recipientText(recipient) {
    if (!recipient || typeof recipient !== "object") return "Recipient unavailable";
    return [
      recipient.name,
      recipient.line1,
      recipient.line2,
      [recipient.city, recipient.state, recipient.postal].filter(Boolean).join(", ").replace(", " + recipient.postal, " " + recipient.postal),
    ].filter(Boolean).join("\n");
  }

  function render() {
    if (!toolResult) return;

    if (toolResult.isError) {
      byId("error").hidden = false;
      byId("error").textContent = "MailMyPDF could not build this review.";
      byId("status").textContent = "Review unavailable.";
      return;
    }

    const structured = toolResult.structuredContent || {};
    const packet = structured.packet || {};
    const review = structured.review || {};
    const recipient = toolInput && toolInput.recipient ? toolInput.recipient : null;
    const mailClass = review.mailClass || (toolInput && toolInput.mail_class);

    setText("price", money(packet.quote && packet.quote.totalCents));
    setText("mailClass", mailClass || "—");
    setText("responsePages", packet.responsePages);
    setText("supportingPages", packet.supportingPages);
    setText("recipient", recipientText(recipient));
    setText("packetHash", packet.packetSha256 || "—");
    setText("recipientHash", review.recipientSha256 || "—");

    byId("content").hidden = false;
    byId("status").textContent = "Confirm these details before authorizing checkout.";
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || typeof message !== "object" || message.jsonrpc !== "2.0") return;

    if (message.id != null && pending.has(message.id)) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || "MCP Apps request failed"));
      else waiter.resolve(message.result);
      return;
    }

    if (message.method === "ui/notifications/tool-input") {
      toolInput = message.params || null;
      render();
    } else if (message.method === "ui/notifications/tool-result") {
      toolResult = message.params || null;
      render();
    }
  });

  async function connect() {
    try {
      await request("ui/initialize", {
        protocolVersion: APP_PROTOCOL,
        appInfo: {
          name: "mailmypdf-packet-review",
          title: "MailMyPDF Mailing Review",
          version: "1.0.0",
        },
        appCapabilities: {},
      });
      notify("ui/notifications/initialized", {});
    } catch (error) {
      byId("error").hidden = false;
      byId("error").textContent = error instanceof Error ? error.message : "Unable to initialize review UI.";
    }
  }

  // ChatGPT compatibility fallback. The MCP Apps notifications remain the
  // canonical data path; these globals only help older compatible hosts.
  if (window.openai) {
    if (window.openai.toolInput) toolInput = window.openai.toolInput;
    if (window.openai.toolOutput) {
      toolResult = {
        structuredContent: window.openai.toolOutput,
        content: [],
        isError: false,
      };
    }
    render();
  }

  void connect();
})();
</script>
</body>
</html>`,
  _meta: {
    ui: {
      prefersBorder: true,
      csp: {
        connectDomains: [],
        resourceDomains: [],
      },
    },
    "openai/ui": {
      availableDisplayModes: ["inline", "fullscreen"],
    },
    "openai/widgetDescription":
      "Review the exact MailMyPDF packet, recipient, service, and price before approval.",
    "openai/widgetPrefersBorder": true,
  },
} as const;
