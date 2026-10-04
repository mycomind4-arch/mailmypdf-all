/** Local, synthetic MCP App host. Never connects to Supabase, payments, mail, or a signed-in account. */
import { createServer } from "node:http";
import { mock } from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  createRecoveryCaseFromScan,
  RecoveryCaseError,
  type RecoveryCasePersistence,
  type StoredRecoveryCase,
} from "../../src/lib/mcp/recovery-case-service";
import { RECOVERY_CASE_RESOURCE } from "../../src/lib/mcp/recovery-case-resource";

const owner = "10000000-0000-4000-8000-000000000001";
const caseId = "20000000-0000-4000-8000-000000000001";
const documentId = "50000000-0000-4000-8000-000000000001";
const rows = new Map<string, StoredRecoveryCase>();
const documents = [
  {
    id: documentId,
    owner_id: owner,
    safe_filename: "October statement.pdf",
    original_filename: "October statement.pdf",
    security_status: "clean",
    deleted_at: null,
    deletion_requested_at: null,
  },
];
const supabase = createClient("https://synthetic.invalid", "synthetic-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: async (input) => {
      const url = new URL(String(input));
      if (
        url.pathname !== "/rest/v1/secure_documents" ||
        url.searchParams.get("owner_id") !== `eq.${owner}`
      )
        throw new Error("Unexpected synthetic document query");
      const ids = url.searchParams.get("id")?.slice(4, -1).split(",") ?? [];
      return new Response(JSON.stringify(documents.filter((d) => ids.includes(d.id))), {
        headers: { "content-type": "application/json" },
      });
    },
  },
});
class AuthenticationError extends Error {}
mock.module("../../src/lib/secure-core/auth.server.ts", {
  namedExports: {
    AuthenticationError,
    requireAuthenticatedUser: async (request: Request) => {
      if (request.headers.get("authorization") !== "Bearer synthetic-owner")
        throw new AuthenticationError("Synthetic sign in required");
      return { user: { id: owner }, supabase };
    },
  },
});
const store: RecoveryCasePersistence = {
  async create(input) {
    rows.set(input.goal.id, structuredClone(input));
    return { stored: structuredClone(input), replayed: false };
  },
  async loadOwned(user, id) {
    const row = rows.get(id);
    return row?.goal.ownerId === user ? structuredClone(row) : undefined;
  },
  async listOwned(user, limit) {
    return [...rows.values()]
      .filter((r) => r.goal.ownerId === user)
      .slice(0, limit)
      .map((r) => structuredClone(r));
  },
  async assertOwnedReferences(user, _case, ids, matters) {
    if (user !== owner || ids.some((id) => id !== documentId) || matters.length)
      throw new RecoveryCaseError(404, "Synthetic reference not found");
  },
  async save(goal, revision) {
    const row = rows.get(goal.id);
    if (!row || row.goal.ownerId !== goal.ownerId || row.goal.revision !== revision)
      throw new RecoveryCaseError(409, "Synthetic revision changed");
    row.goal = structuredClone(goal);
    return structuredClone(row);
  },
};
mock.module("../../src/lib/mcp/recovery-store.server.ts", {
  namedExports: { createRecoveryCaseStore: () => store },
});
const { handleMailMyPdfMcpRequest } = await import("../../src/lib/mcp/mcp-handler.server");
const allowed = new Set([
  "save_recovery_case",
  "get_recovery_case",
  "list_recovery_cases",
  "update_recovery_case",
]);
const wireCalls: unknown[] = [];
async function seed() {
  rows.clear();
  wireCalls.length = 0;
  for (const [n, merchant, amount] of [
    [1, "Northstar Internet", 8900],
    [2, "Harbor Mobile", 4500],
  ] as const) {
    const transaction = (id: string) => ({
      id,
      accountId: "Checking alias",
      merchant,
      amountMinor: amount,
      currency: "USD",
      postedAt: "2026-10-04T08:00:00Z",
      state: "settled",
      kind: "debit",
    });
    await createRecoveryCaseFromScan(
      {
        transactions: [transaction(`one-${n}`), transaction(`two-${n}`)],
        candidate_id: `duplicate:one-${n}`,
        desired_outcome: "Recover the confirmed extra charge and keep the evidence together.",
        user_confirmed_save: true,
        idempotency_key: `synthetic-${n}`,
      },
      owner,
      store,
      {
        now: () => "2026-10-04T08:00:00Z",
        newId: () => (n === 1 ? caseId : "20000000-0000-4000-8000-000000000002"),
      },
    );
  }
}
await seed();
const host = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic recovery app host</title><style>html,body{margin:0;background:#f5f6f2}iframe{display:block;width:100%;border:0;height:1450px} @media(prefers-color-scheme:dark){html,body{background:#0f1a14}}</style><iframe title="MailMyPDF saved recovery cases" src="/app" sandbox="allow-scripts allow-same-origin"></iframe><script>
const app=document.querySelector('iframe'); const messages=[]; window.harness={messages};
let hostId=0;
async function tool(name,args={}){const response=await fetch('/test-mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++hostId,method:'tools/call',params:{name,arguments:args}})}); const payload=await response.json(); if(payload.error)throw new Error('Synthetic tool error');return payload.result;}
window.addEventListener('message',async event=>{if(event.source!==app.contentWindow)return;const m=event.data;if(m?.jsonrpc!=='2.0')return;messages.push(m);const reply=result=>app.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result},'*');
if(m.method==='ui/initialize')reply({protocolVersion:'2026-01-26',hostInfo:{name:'synthetic-host',version:'1'},hostCapabilities:{serverTools:{},message:{text:true},updateModelContext:{}}});
else if(m.method==='ui/notifications/initialized'){app.contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:await tool('list_recovery_cases')},'*');}
else if(m.method==='tools/call'){try{reply(await tool(m.params.name,m.params.arguments));}catch{app.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,error:{code:-32000,message:'Synthetic failure'}},'*');}}
else if(m.method==='ui/notifications/size-changed'&&Number.isFinite(m.params.height)&&m.params.height>0)app.style.height=Math.ceil(m.params.height)+'px';
else if(m.method==='ui/message'||m.method==='ui/update-model-context')reply({});
});</script></html>`;
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? "/", "http://127.0.0.1");
    outgoing.setHeader("cache-control", "no-store");
    if (url.pathname === "/") {
      outgoing.setHeader("content-type", "text/html");
      outgoing.end(host);
      return;
    }
    if (url.pathname === "/app") {
      outgoing.setHeader("content-type", "text/html");
      outgoing.end(RECOVERY_CASE_RESOURCE.text);
      return;
    }
    if (url.pathname === "/reset" && incoming.method === "POST") {
      await seed();
      outgoing.end("ok");
      return;
    }
    if (url.pathname === "/concurrent" && incoming.method === "POST") {
      const row = rows.get(caseId)!;
      row.goal = { ...row.goal, revision: row.goal.revision + 1 };
      outgoing.end("ok");
      return;
    }
    if (url.pathname === "/diagnostics") {
      outgoing.setHeader("content-type", "application/json");
      outgoing.end(JSON.stringify({ cases: [...rows.values()].map((r) => r.goal), wireCalls }));
      return;
    }
    if (url.pathname === "/test-mcp" && incoming.method === "POST") {
      let body = "";
      for await (const chunk of incoming) {
        body += chunk;
        if (body.length > 500000) throw new Error("Fixture request too large");
      }
      const rpc = JSON.parse(body);
      if (rpc.method !== "tools/call" || !allowed.has(rpc.params?.name))
        throw new Error("Unsupported fixture tool");
      wireCalls.push(rpc.params);
      const result = await handleMailMyPdfMcpRequest(
        new Request("https://synthetic.invalid/api/mcp", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer synthetic-owner" },
          body,
        }),
      );
      outgoing.statusCode = result.status;
      outgoing.setHeader("content-type", "application/json");
      outgoing.end(await result.text());
      return;
    }
    outgoing.statusCode = 404;
    outgoing.end("Not found");
  } catch {
    outgoing.statusCode = 500;
    outgoing.end(JSON.stringify({ error: "Synthetic harness failure" }));
  }
});
export const harnessUrl = await new Promise<string>((resolve) =>
  server.listen(Number(process.env.RECOVERY_HARNESS_PORT ?? 0), "127.0.0.1", () =>
    resolve("http://127.0.0.1:" + (server.address() as { port: number }).port),
  ),
);
export const closeHarness = () =>
  new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
