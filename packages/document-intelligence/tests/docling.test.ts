import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createId } from "@mailmypdf/core";
import { DoclingHttpProvider } from "../src/index.js";

const request = { documentId: createId("doc-1"), filename: "invoice.pdf", contentType: "application/pdf", content: new Uint8Array([0, 255, 65]) };
const payload = () => ({
  status: "success",
  document: { text_content: "Invoice\nTotal: 89", json_content: {
    schema_name: "DoclingDocument", pages: { "1": { page_no: 1 }, "2": { page_no: 2 } },
    texts: [{ text: "Invoice", prov: [{ page_no: 1 }] }],
    tables: [{ prov: [{ page_no: 2 }], data: { num_rows: 1, num_cols: 2, table_cells: [
      { text: "Total", start_row_offset_idx: 0, start_col_offset_idx: 0 },
      { text: "89", start_row_offset_idx: 0, start_col_offset_idx: 1 },
    ] } }],
  } },
});
function mockFetch(t: TestContext, body: unknown, inspect?: (url: unknown, init?: RequestInit) => void) {
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    inspect?.(url, init);
    return new Response(JSON.stringify(body));
  });
}

test("Docling requires HTTPS, credentials-free endpoints, and bounded configuration", () => {
  for (const endpoint of ["http://localhost:8080", "https://secret:password@example.com"]) {
    assert.throws(() => new DoclingHttpProvider({ endpoint }));
  }
  assert.throws(() => new DoclingHttpProvider({ endpoint: "https://docling.example", timeoutMs: 0 }), /timeout/);
  assert.throws(() => new DoclingHttpProvider({ endpoint: "https://docling.example", maxResponseBytes: 10 }), /limit/);
  assert.throws(() => new DoclingHttpProvider({ endpoint: "https://docling.example/extract" }), /legacy/);
  assert.throws(() => new DoclingHttpProvider({ endpoint: "https://docling.example?token=secret" }), /query/);
});

test("native v1 encodes bytes, uses API-key authentication, and preserves table/page provenance", async (t) => {
  mockFetch(t, payload(), (url, init) => {
    assert.equal(String(url), "https://docling.example/v1/convert/source");
    assert.equal(init?.redirect, "error");
    assert.equal((init?.headers as Record<string, string>)["X-Api-Key"], "test-key");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      sources: [{ kind: "file", filename: "invoice.pdf", base64_string: "AP9B" }],
      options: { to_formats: ["json", "text"], image_export_mode: "placeholder" }, target: { kind: "inbody" },
    });
  });
  const provider = new DoclingHttpProvider({ endpoint: "https://docling.example", apiKey: "test-key" });
  const result = await provider.extract(request);
  assert.equal(provider.name, "docling");
  assert.equal(result.documentId, request.documentId);
  assert.equal(result.text, "Invoice\nTotal: 89");
  assert.deepEqual(result.pages, [{ pageNumber: 1, text: "Invoice" }, { pageNumber: 2, text: "Total\t89" }]);
  assert.deepEqual(result.tables, [{ page: 2, rows: [["Total", "89"]] }]);
  assert.equal(result.sourceRefs[1]?.page, 2);
});

test("legacy wrappers remain explicitly supported", async (t) => {
  mockFetch(t, { text: "legacy text", pages: [{ pageNumber: 4, text: "legacy text" }] }, (_, init) => {
    assert.equal(JSON.parse(String(init?.body)).content_base64, "AP9B");
  });
  const result = await new DoclingHttpProvider({ endpoint: "https://docling.example/extract", protocol: "legacy" }).extract(request);
  assert.equal(result.text, "legacy text");
  assert.equal(result.pages[0]?.pageNumber, 4);
});
test("unlocated native text is retained without inventing page provenance", async (t) => {
  mockFetch(t, { status: "success", document: { json_content: { texts: [{ text: "Unlocated evidence", prov: [] }] } } });
  const result = await new DoclingHttpProvider({ endpoint: "https://docling.example" }).extract(request);
  assert.equal(result.text, "Unlocated evidence");
  assert.deepEqual(result.pages, []);
});

test("partial conversion is visible and MIME kinds are preserved", async (t) => {
  mockFetch(t, { ...payload(), status: "partial_success" });
  const result = await new DoclingHttpProvider({ endpoint: "https://docling.example" }).extract({ ...request, contentType: "image/png" });
  assert.equal(result.kind, "image");
  assert.match(result.warnings.join(" "), /incomplete/);
});

test("HTTP 200 does not disguise failed, skipped, missing, or malformed conversion results", async (t) => {
  for (const body of [{ status: "failure" }, { status: "skipped" }, { status: "success", document: {} }, null, []]) {
    const stub = t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(body)));
    await assert.rejects(new DoclingHttpProvider({ endpoint: "https://docling.example" }).extract(request), /Docling/);
    stub.mock.restore();
  }
});

test("sparse pages remain ordered and missing provenance never becomes page one", async (t) => {
  const body = payload();
  body.document.json_content.pages = { "2": { page_no: 2 }, "1": { page_no: 1 } };
  body.document.json_content.texts = [{ text: "unlocated", prov: [] }];
  mockFetch(t, body);
  const result = await new DoclingHttpProvider({ endpoint: "https://docling.example" }).extract(request);
  assert.equal(result.pages[0]?.text, "");
  assert.equal(result.sourceRefs.every((ref) => ref.page === 2), true);
});

test("oversized sparse table dimensions are rejected before allocating a matrix", async (t) => {
  const body = payload();
  body.document.json_content.tables[0]!.data.num_rows = 100_001;
  mockFetch(t, body);
  await assert.rejects(new DoclingHttpProvider({ endpoint: "https://docling.example" }).extract(request), /dimensions/);
});

test("HTTP errors, invalid JSON and oversized streams fail closed", async (t) => {
  for (const response of [new Response("secret", { status: 503 }), new Response("not JSON"), new Response("x".repeat(2048))]) {
    const stub = t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(new DoclingHttpProvider({ endpoint: "https://docling.example", maxResponseBytes: 1024 }).extract(request), /Docling/);
    stub.mock.restore();
  }
});

test("document identity and byte limits are checked before network access", async (t) => {
  const stub = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected network"); });
  const provider = new DoclingHttpProvider({ endpoint: "https://docling.example" });
  for (const input of [{ ...request, filename: " " }, { ...request, content: new Uint8Array() }, { ...request, content: new Uint8Array(24 * 1024 * 1024 + 1) }]) {
    await assert.rejects(provider.extract(input));
  }
  assert.equal(stub.mock.callCount(), 0);
});

test("timeout includes the response body, not only HTTP headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (_: unknown, init?: RequestInit) => new Response(new ReadableStream({
    start(controller) { init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true }); },
  })));
  await assert.rejects(new DoclingHttpProvider({ endpoint: "https://docling.example", timeoutMs: 1000 }).extract(request), /timed out/);
});
