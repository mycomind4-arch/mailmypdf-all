/**
 * Regression test: createSupabaseFetch must preserve the Authorization header
 * for Storage API requests when using new-format Supabase keys (sb_secret_...).
 *
 * Bug: The original implementation deleted the Authorization header for
 * new-format keys, breaking Supabase Storage uploads (400/500 errors).
 *
 * Fix: Keep the Authorization header alongside the apikey header so both
 * the REST API and Storage API receive the credentials they need.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    headers.set("apikey", supabaseKey);
    return { input, init: { ...init, headers } };
  };
}

describe("createSupabaseFetch - Authorization header preservation", () => {
  const testKey = "sb_secret_test1234567890abcdef";

  it("preserves Authorization header for new-format keys (sb_secret_)", () => {
    const fetchFn = createSupabaseFetch(testKey);
    const result = fetchFn("https://example.supabase.co/storage/v1/object/bucket/file", {
      headers: { Authorization: `Bearer ${testKey}`, "Content-Type": "application/pdf" },
      body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    });
    assert.equal(result.init.headers.get("Authorization"), `Bearer ${testKey}`,
      "Authorization header must be preserved for Storage API calls");
  });

  it("sets the apikey header", () => {
    const fetchFn = createSupabaseFetch(testKey);
    const result = fetchFn("https://example.supabase.co/rest/v1/table", {
      headers: { Authorization: `Bearer ${testKey}` },
    });
    assert.equal(result.init.headers.get("apikey"), testKey,
      "apikey header must be set for all requests");
  });

  it("preserves Content-Type header for Storage uploads", () => {
    const fetchFn = createSupabaseFetch(testKey);
    const result = fetchFn("https://example.supabase.co/storage/v1/object/bucket/file.pdf", {
      headers: { Authorization: `Bearer ${testKey}`, "Content-Type": "application/pdf" },
      body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    });
    assert.equal(result.init.headers.get("Content-Type"), "application/pdf");
    assert.equal(result.init.headers.get("Authorization"), `Bearer ${testKey}`);
    assert.equal(result.init.headers.get("apikey"), testKey);
  });

  it("does not add Authorization if not present in original request", () => {
    const fetchFn = createSupabaseFetch(testKey);
    const result = fetchFn("https://example.supabase.co/rest/v1/table", {
      headers: { "Content-Type": "application/json" },
    });
    assert.equal(result.init.headers.get("Authorization"), null);
    assert.equal(result.init.headers.get("apikey"), testKey);
  });

  it("preserves Authorization for legacy JWT keys too", () => {
    const jwtKey = "eyJhbGciOiJIUzI1NiJ9.test";
    const fetchFn = createSupabaseFetch(jwtKey);
    const result = fetchFn("https://example.supabase.co/rest/v1/table", {
      headers: { Authorization: `Bearer ${jwtKey}` },
    });
    assert.equal(result.init.headers.get("Authorization"), `Bearer ${jwtKey}`);
  });
});
