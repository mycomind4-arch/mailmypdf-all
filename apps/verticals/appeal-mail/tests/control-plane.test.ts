import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  resolveControlPlaneConfig,
  validateControlPlaneToken,
  handleControlPlaneRequest,
  ControlPlaneError,
} from "../src/platform/control-plane-logic";

/* ═══════════════════════════════════════════════════════════
   Control Plane AI — regression tests

   Verifies the self-hosted control plane endpoint logic:
     - rejects unauthenticated requests (401)
     - rejects wrong token (401)
     - returns 503 when GEMINI_API_KEY is missing
     - returns 503 when control plane token is missing
     - returns valid config when properly configured
     - returns task-specific models
     - rejects invalid JSON
   ═══════════════════════════════════════════════════════════ */

function makeRequest(body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request("https://test.local/api/control-plane/ai", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Control Plane AI resolver", () => {
  const savedToken = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  const savedKey = process.env.GEMINI_API_KEY;
  const savedModel = process.env.GEMINI_MODEL;
  const savedDraftModel = process.env.GEMINI_MODEL_DRAFT;

  beforeEach(() => {
    process.env.MAILMYPDF_CONTROL_PLANE_TOKEN = "test-control-plane-token";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.GEMINI_MODEL;       // test the default
    delete process.env.GEMINI_MODEL_DRAFT;
  });

  afterEach(() => {
    if (savedToken !== undefined) process.env.MAILMYPDF_CONTROL_PLANE_TOKEN = savedToken;
    else delete process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
    if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey;
    else delete process.env.GEMINI_API_KEY;
    if (savedModel !== undefined) process.env.GEMINI_MODEL = savedModel;
    else delete process.env.GEMINI_MODEL;
    if (savedDraftModel !== undefined) process.env.GEMINI_MODEL_DRAFT = savedDraftModel;
    else delete process.env.GEMINI_MODEL_DRAFT;
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const request = makeRequest({ verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "analysis" });
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "Unauthorized.");
  });

  it("returns 401 with wrong Bearer token", async () => {
    const request = makeRequest(
      { verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "analysis" },
      "wrong-token",
    );
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 401);
  });

  it("returns 503 when control plane token is not configured", async () => {
    delete process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
    const request = makeRequest({ verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "analysis" });
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.ok(body.error.includes("not configured"));
  });

  it("returns 503 when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    const request = makeRequest(
      { verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "analysis" },
      "test-control-plane-token",
    );
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.ok(body.error.includes("Gemini API key"));
  });

  it("returns valid Gemini config with default model gemini-3.6-flash", async () => {
    const request = makeRequest(
      { verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "analysis" },
      "test-control-plane-token",
    );
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.provider, "gemini");
    assert.equal(body.apiKey, "test-gemini-key");
    assert.equal(body.model, "gemini-3.6-flash");
    assert.equal(body.promptOverride, null);
  });

  it("returns task-specific model when GEMINI_MODEL_DRAFT is set", async () => {
    process.env.GEMINI_MODEL_DRAFT = "gemini-3.7-flash";
    const request = makeRequest(
      { verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task: "draft" },
      "test-control-plane-token",
    );
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.model, "gemini-3.7-flash");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("https://test.local/api/control-plane/ai", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-control-plane-token",
      },
      body: "not-json",
    });
    const response = await handleControlPlaneRequest(request);
    assert.equal(response.status, 400);
  });

  it("validateControlPlaneToken rejects empty header", () => {
    assert.equal(validateControlPlaneToken(""), false);
    assert.equal(validateControlPlaneToken("Basic abc"), false);
  });

  it("resolveControlPlaneConfig throws ControlPlaneError without key", () => {
    delete process.env.GEMINI_API_KEY;
    assert.throws(
      () => resolveControlPlaneConfig({ task: "analysis" }),
      ControlPlaneError,
    );
  });
});
