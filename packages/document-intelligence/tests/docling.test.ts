import assert from "node:assert/strict";
import test from "node:test";
import { createId } from "@mailmypdf/core";
import { DoclingHttpProvider } from "../src/index.js";

test("Docling provider requires HTTPS", () => {
  assert.throws(
    () => new DoclingHttpProvider({ endpoint: "http://localhost:8080/extract", timeoutMs: 5000 }),
    /HTTPS/,
  );
});

test("Docling provider rejects unsafe timeout configuration", () => {
  assert.throws(
    () => new DoclingHttpProvider({ endpoint: "https://docling.example/extract", timeoutMs: 0 }),
    /timeout/,
  );
});

test("Docling provider exposes a stable platform provider name", () => {
  const provider = new DoclingHttpProvider({ endpoint: "https://docling.example/extract", timeoutMs: 5000 });
  assert.equal(provider.name, "docling");
  assert.ok(createId("document-1"));
});
