import { after, before, describe, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";
import {
  AiGatewayError,
  DocumentNotDisclosableError,
  askModel,
  askModelAboutDocument,
  loadDisclosableDocument,
} from "../src/lib/secure-core/ai-gateway.server";

const OWNER = "11111111-1111-4111-8111-111111111111";
const CASE = "22222222-2222-4222-8222-222222222222";
const DOCUMENT = "33333333-3333-4333-8333-333333333333";
const PDF = Buffer.from("%PDF-1.7\nSynthetic notice only\n%%EOF");
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const vaultUrl = "https://synthetic-vault.example.invalid";
const modelUrl = "https://api.anthropic.com/v1/messages";

// Real SDK query construction with a fully replaced network boundary. These
// tests must never connect to a project or transmit a document to a provider.
const environmentKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
before(() => {
  process.env.SUPABASE_URL = vaultUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role-key";
  process.env.ANTHROPIC_API_KEY = "synthetic-provider-key";
});
after(() => {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function harness(t: TestContext) {
  const state = {
    document: {
      id: DOCUMENT,
      safe_filename: "synthetic-notice.pdf",
      mime_type: "application/pdf",
      size_bytes: PDF.byteLength,
      sha256: sha(PDF),
      security_status: "clean",
      deleted_at: null as string | null,
      deletion_requested_at: null as string | null,
      retention_until: "2099-01-01T00:00:00.000Z",
      storage_path: `${OWNER}/synthetic-notice.pdf`,
    },
    attached: true,
    auditFails: false,
    onAudit: () => {},
    onStorageRead: () => {},
    storageResponse: () => new Response(PDF),
    modelResponse: () => Response.json({ content: [{ type: "text", text: "Synthetic result" }], stop_reason: "end_turn" }),
    calls: [] as string[],
    audits: [] as Record<string, unknown>[],
    providerBodies: [] as Record<string, unknown>[],
    providerOptions: [] as RequestInit[],
    storageOptions: [] as RequestInit[],
  };
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    state.calls.push(`${init?.method ?? "GET"} ${url.pathname}`);
    if (url.href === modelUrl) {
      state.providerBodies.push(JSON.parse(String(init?.body)));
      state.providerOptions.push(init ?? {});
      return state.modelResponse();
    }
    assert.equal(url.origin, vaultUrl, "unexpected network destination");
    if (url.pathname === "/rest/v1/case_documents") {
      assert.equal(url.searchParams.get("owner_id"), `eq.${OWNER}`);
      assert.equal(url.searchParams.get("case_id"), `eq.${CASE}`);
      assert.equal(url.searchParams.get("document_id"), `eq.${DOCUMENT}`);
      return Response.json(state.attached ? { document_id: DOCUMENT } : null);
    }
    if (url.pathname === "/rest/v1/secure_documents") {
      assert.equal(url.searchParams.get("owner_id"), `eq.${OWNER}`);
      assert.equal(url.searchParams.get("id"), `eq.${DOCUMENT}`);
      return Response.json(state.document);
    }
    if (url.pathname === "/rest/v1/security_events") {
      state.audits.push(JSON.parse(String(init?.body)));
      state.onAudit();
      return state.auditFails
        ? Response.json({ message: "synthetic private database detail" }, { status: 400 })
        : new Response(null, { status: 201 });
    }
    if (url.pathname.startsWith("/storage/v1/object/sign/")) {
      if (init?.method === "POST") return Response.json({ signedURL: "/object/sign/secure-documents/synthetic?token=synthetic-token" });
      state.storageOptions.push(init ?? {});
      state.onStorageRead();
      return state.storageResponse();
    }
    assert.fail(`unexpected synthetic request: ${url.pathname}`);
  });
  const context = {
    user: { id: OWNER },
    supabase: createClient(vaultUrl, "synthetic-user-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, init) },
    }),
  } as AuthenticatedUserContext;
  const load = () => loadDisclosableDocument(CASE, DOCUMENT, context);
  const disclose = async () => askModelAboutDocument({
    document: await load(), purpose: "notice_analysis", systemPrompt: "Synthetic task",
    instruction: "Read synthetic data", context,
  });
  return { state, context, load, disclose };
}

describe("verified document disclosure", () => {
  test("sends verified bytes only after a content-free audit succeeds", async (t) => {
    const { state, disclose } = harness(t);
    assert.equal((await disclose()).text, "Synthetic result");
    assert.ok(state.calls.indexOf("POST /rest/v1/security_events") < state.calls.indexOf("POST /v1/messages"));
    assert.deepEqual(state.audits[0], {
      owner_id: OWNER, document_id: DOCUMENT, event_type: "document.disclosed_to_model",
      metadata: { purpose: "notice_analysis", model: "claude-sonnet-5", provider: "anthropic", size_bytes: PDF.byteLength },
    });
    assert.equal(state.providerBodies.length, 1);
    assert.equal(state.storageOptions[0].redirect, "error");
    assert.ok(state.storageOptions[0].signal instanceof AbortSignal);
    assert.equal(state.providerOptions[0].redirect, "error");
  });

  test("changed storage bytes never reach the model", async (t) => {
    const { state, disclose } = harness(t);
    state.storageResponse = () => new Response(Buffer.from(PDF.toString().replace("notice", "forged")));
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
    assert.equal(state.audits.length, 0);
  });

  test("mismatched byte counts never reach the model", async (t) => {
    const { state, disclose } = harness(t);
    state.document.size_bytes += 1;
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  test("matching hashes cannot disguise non-PDF content", async (t) => {
    const { state, disclose } = harness(t);
    const bytes = Buffer.from("synthetic non-PDF bytes");
    state.document.sha256 = sha(bytes);
    state.document.size_bytes = bytes.length;
    state.storageResponse = () => new Response(bytes);
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  for (const invalidState of ["scanning", "rejected", "deleting", "deleted"]) {
    test(`refuses ${invalidState} documents before storage access`, async (t) => {
      const { state, load } = harness(t);
      state.document.security_status = invalidState;
      await assert.rejects(load(), DocumentNotDisclosableError);
      assert.equal(state.storageOptions.length, 0);
    });
  }

  test("expired retention blocks reading even before the retention worker runs", async (t) => {
    const { state, load } = harness(t);
    state.document.retention_until = "2000-01-01T00:00:00.000Z";
    await assert.rejects(load(), DocumentNotDisclosableError);
    assert.equal(state.storageOptions.length, 0);
  });

  test("missing integrity metadata prevents storage access", async (t) => {
    const { state, load } = harness(t);
    state.document.sha256 = "";
    await assert.rejects(load(), DocumentNotDisclosableError);
    assert.equal(state.storageOptions.length, 0);
  });

  test("foreign storage paths cannot use the privileged signer", async (t) => {
    const { state, load } = harness(t);
    state.document.storage_path = "other-owner/synthetic.pdf";
    await assert.rejects(load(), DocumentNotDisclosableError);
    assert.equal(state.calls.some((call) => call.startsWith("POST /storage/")), false);
  });

  test("deletion requested during the storage read prevents disclosure", async (t) => {
    const { state, disclose } = harness(t);
    state.onStorageRead = () => { state.document.deletion_requested_at = new Date().toISOString(); };
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  test("a detached notice cannot be disclosed using a previously loaded document", async (t) => {
    const { state, context, load } = harness(t);
    const document = await load();
    state.attached = false;
    await assert.rejects(askModelAboutDocument({ document, context, purpose: "notice_analysis", systemPrompt: "Synthetic", instruction: "Synthetic" }), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  test("deletion requested during audit still prevents the provider call", async (t) => {
    const { state, disclose } = harness(t);
    state.onAudit = () => { state.document.deletion_requested_at = new Date().toISOString(); };
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  test("retention expiring during audit prevents the provider call", async (t) => {
    const { state, disclose } = harness(t);
    state.onAudit = () => { state.document.retention_until = "2000-01-01T00:00:00.000Z"; };
    await assert.rejects(disclose(), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
  });

  test("a document cannot be altered or replaced after gateway verification", async (t) => {
    const { state, context, load } = harness(t);
    const document = await load();
    assert.throws(() => { document.base64 = Buffer.from("synthetic forged data").toString("base64"); }, TypeError);
    await assert.rejects(askModelAboutDocument({ document: { ...document }, context, purpose: "notice_analysis", systemPrompt: "Synthetic", instruction: "Synthetic" }), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
    assert.equal(state.audits.length, 0);
  });

  test("verified bytes cannot be reused by another user context", async (t) => {
    const { state, context, load } = harness(t);
    const document = await load();
    const otherContext = { ...context, user: { ...context.user, id: "44444444-4444-4444-8444-444444444444" } };
    await assert.rejects(askModelAboutDocument({ document, context: otherContext, purpose: "notice_analysis", systemPrompt: "Synthetic", instruction: "Synthetic" }), DocumentNotDisclosableError);
    assert.equal(state.providerBodies.length, 0);
    assert.equal(state.audits.length, 0);
  });

  test("audit failure prevents the provider call without reflecting database details", async (t) => {
    const { state, disclose } = harness(t);
    state.auditFails = true;
    await assert.rejects(disclose(), (error: Error) => error instanceof AiGatewayError && !error.message.includes("private database detail"));
    assert.equal(state.providerBodies.length, 0);
  });

  test("cancels a streamed document as soon as it exceeds the declared byte count", async (t) => {
    const { state, load } = harness(t);
    let reads = 0;
    let cancelled = false;
    state.storageResponse = () => new Response(new ReadableStream({
      pull(controller) { reads += 1; controller.enqueue(PDF); if (reads === 100) controller.close(); },
      cancel() { cancelled = true; },
    }));
    await assert.rejects(load(), DocumentNotDisclosableError);
    assert.ok(reads < 100, "must not buffer the full hostile stream");
    assert.equal(cancelled, true);
  });

  test("rejects an oversized Content-Length without reading document bytes", async (t) => {
    const { state, load } = harness(t);
    let read = false;
    state.storageResponse = () => new Response(new ReadableStream({
      pull(controller) { read = true; controller.enqueue(PDF); controller.close(); },
    }, { highWaterMark: 0 }), { headers: { "content-length": String(PDF.length + 1) } });
    await assert.rejects(load(), DocumentNotDisclosableError);
    assert.equal(read, false);
  });

  test("aborts a stalled document response instead of waiting indefinitely", async (t) => {
    const { state, load } = harness(t);
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let aborted = false;
    state.storageResponse = () => new Response(new ReadableStream({
      start(controller) {
        state.storageOptions[0].signal!.addEventListener("abort", () => {
          aborted = true;
          controller.error(new Error("synthetic private download URL"));
        });
        queueMicrotask(() => t.mock.timers.tick(30_001));
      },
    }));
    await assert.rejects(load(), (error: Error) => error instanceof AiGatewayError && !error.message.includes("private download URL"));
    assert.equal(aborted, true);
  });
});

describe("provider failure containment", () => {
  for (const withDocument of [false, true]) {
    test(`${withDocument ? "document" : "text"} errors never reflect provider response bodies`, async (t) => {
      const { state, disclose } = harness(t);
      let bodyRead = false;
      state.modelResponse = () => new Response(new ReadableStream({
        pull(controller) { bodyRead = true; controller.enqueue(new TextEncoder().encode("SYNTHETIC_PRIVATE_CASE_DATA")); controller.close(); },
      }, { highWaterMark: 0 }), { status: 400 });
      const call = withDocument ? disclose() : askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" });
      await assert.rejects(call, (error: Error) => error instanceof AiGatewayError && !error.message.includes("SYNTHETIC_PRIVATE_CASE_DATA"));
      assert.equal(bodyRead, false);
    });
  }

  test("network errors become generic gateway errors", async (t) => {
    const { state } = harness(t);
    state.modelResponse = () => { throw new Error("SYNTHETIC_PRIVATE_CASE_DATA"); };
    await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" }),
      (error: Error) => error instanceof AiGatewayError && !error.message.includes("SYNTHETIC_PRIVATE_CASE_DATA"));
  });

  test("truncated provider output cannot be presented as a complete draft", async (t) => {
    const { state } = harness(t);
    state.modelResponse = () => Response.json({ content: [{ type: "text", text: "Partial synthetic letter" }], stop_reason: "max_tokens" });
    await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" }), AiGatewayError);
  });

  test("malformed response JSON never exposes provider content through parse errors", async (t) => {
    const { state } = harness(t);
    state.modelResponse = () => new Response("SYNTHETIC_PRIVATE_CASE_DATA");
    await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" }),
      (error: Error) => error instanceof AiGatewayError && !error.message.includes("SYNTHETIC_PRIVATE_CASE_DATA"));
  });

  test("invalid response token limits fail before the provider request", async (t) => {
    const { state } = harness(t);
    for (const maxTokens of [0, -1, 1.5, 8193, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic", maxTokens }), AiGatewayError);
    }
    assert.equal(state.providerBodies.length, 0);
  });

  test("aborts a stalled provider response without reflecting its failure", async (t) => {
    const { state } = harness(t);
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let aborted = false;
    state.modelResponse = () => new Response(new ReadableStream({
      start(controller) {
        state.providerOptions[0].signal!.addEventListener("abort", () => {
          aborted = true;
          controller.error(new Error("SYNTHETIC_PRIVATE_CASE_DATA"));
        });
        queueMicrotask(() => t.mock.timers.tick(90_001));
      },
    }));
    await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" }),
      (error: Error) => error instanceof AiGatewayError && error.message === "Model request timed out");
    assert.equal(aborted, true);
  });

  test("unbounded provider output is cancelled before the entire body is read", async (t) => {
    const { state } = harness(t);
    let reads = 0;
    let cancelled = false;
    const chunk = new Uint8Array(64 * 1024);
    state.modelResponse = () => new Response(new ReadableStream({
      pull(controller) { reads += 1; controller.enqueue(chunk); if (reads === 100) controller.close(); },
      cancel() { cancelled = true; },
    }));
    await assert.rejects(askModel({ systemPrompt: "Synthetic", instruction: "Synthetic" }), AiGatewayError);
    assert.ok(reads < 100);
    assert.equal(cancelled, true);
  });
});
