import assert from "node:assert/strict";
import test from "node:test";
import { readJsonObject, secureJson, SecureHttpError } from "../src/http.js";

test("secureJson always disables caching", async () => {
  const response = secureJson(200, { ok: true });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.deepEqual(await response.json(), { ok: true });
});

test("readJsonObject rejects non-json content", async () => {
  await assert.rejects(
    () => readJsonObject(new Request("https://example.test", { method: "POST", body: "x" })),
    (error: unknown) => error instanceof SecureHttpError && error.status === 415,
  );
});

test("readJsonObject enforces a byte limit", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "0123456789" }),
  });
  await assert.rejects(
    () => readJsonObject(request, { maxBytes: 5 }),
    (error: unknown) => error instanceof SecureHttpError && error.status === 413,
  );
});
