import assert from "node:assert/strict";
import test from "node:test";
import { validateRuthlessEndpoint, ruthlessRequest, RuthlessUnavailableError } from "../src/studio/platform/ruthless-client.server";

test("Ruthless backend blocks unconfigured and unsafe remote API origins", () => {
  assert.throws(() => validateRuthlessEndpoint("", undefined), RuthlessUnavailableError);
  assert.throws(() => validateRuthlessEndpoint("http://example.com/", undefined), /HTTPS/);
  assert.throws(() => validateRuthlessEndpoint("https://example.com/", undefined), /TOKEN/);
  assert.throws(() => validateRuthlessEndpoint("https://example.com/api", "a".repeat(40)), /only its origin/);
  assert.throws(() => validateRuthlessEndpoint("http://user:secret@127.0.0.1:3001/", undefined), /credentials/);
  assert.equal(validateRuthlessEndpoint("http://127.0.0.1:3001/", undefined).origin, "http://127.0.0.1:3001");
  assert.equal(validateRuthlessEndpoint("https://research.example.com/", "a".repeat(40)).origin, "https://research.example.com");
});

test("Ruthless bridge issues only mapped server requests and sends bearer token", { concurrency: false }, async () => {
  const priorUrl = process.env.STUDIO_RUTHLESS_API_URL;
  const priorToken = process.env.STUDIO_RUTHLESS_API_TOKEN;
  const priorFetch = globalThis.fetch;
  const captured: Array<{ target: string; init: RequestInit }> = [];
  try {
    process.env.STUDIO_RUTHLESS_API_URL = "https://research.example.com/";
    process.env.STUDIO_RUTHLESS_API_TOKEN = "test-".repeat(9);
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      captured.push({ target: String(url), init: init ?? {} });
      return Response.json({ id: "inv-abc123", phase: "CREATED" });
    };
    const created = await ruthlessRequest("start", { question: "What happened?", budgetUSD: 5, mode: "STANDARD" }) as { id: string };
    assert.equal(created.id, "inv-abc123");
    await ruthlessRequest("state", {}, "inv-abc123");
    assert.equal(captured.length, 2);
    assert.equal(captured[0]?.target, "https://research.example.com/api/investigations");
    assert.equal(captured[0]?.init.method, "POST");
    assert.equal((captured[0]?.init.headers as Record<string, string>).authorization, "Bearer " + "test-".repeat(9));
    assert.equal(captured[1]?.target, "https://research.example.com/api/investigations/inv-abc123");
    assert.equal(captured[1]?.init.method, "GET");
    assert.equal(captured[0]?.init.redirect, "error");
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.STUDIO_RUTHLESS_API_URL; else process.env.STUDIO_RUTHLESS_API_URL = priorUrl;
    if (priorToken === undefined) delete process.env.STUDIO_RUTHLESS_API_TOKEN; else process.env.STUDIO_RUTHLESS_API_TOKEN = priorToken;
  }
});

test("Ruthless route preserves upstream errors and does not silently fake research", { concurrency: false }, async () => {
  const oldUrl = process.env.STUDIO_RUTHLESS_API_URL, oldToken = process.env.STUDIO_RUTHLESS_API_TOKEN;
  const oldFetch = globalThis.fetch;
  try {
    process.env.STUDIO_RUTHLESS_API_URL = "http://127.0.0.1:3001/";
    delete process.env.STUDIO_RUTHLESS_API_TOKEN;
    globalThis.fetch = async () => new Response('{"error":"Unauthorized"}', { status: 401 });
    await assert.rejects(ruthlessRequest("health"), /rejected the service token/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.STUDIO_RUTHLESS_API_URL; else process.env.STUDIO_RUTHLESS_API_URL = oldUrl;
    if (oldToken === undefined) delete process.env.STUDIO_RUTHLESS_API_TOKEN; else process.env.STUDIO_RUTHLESS_API_TOKEN = oldToken;
  }
});
