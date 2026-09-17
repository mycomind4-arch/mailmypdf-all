import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertRegistrySourceUsable,
  RegistryAdapterError,
  normalizeRegistryArtifact,
} from "../src/index.js";

describe("registry source policy", () => {
  test("blocks non-HTTPS sources", () => {
    assert.throws(() => assertRegistrySourceUsable({
      id: "bad",
      name: "Bad source",
      kind: "public-index",
      jurisdiction: { country: "US" },
      officialUrl: "http://example.gov",
      accessMethod: "api",
      capabilities: ["name-search"],
      enabled: true,
    }), (error: unknown) =>
      error instanceof RegistryAdapterError && error.code === "SOURCE_REQUIRES_HTTPS",
    );
  });

  test("requires explicit robots and terms review before browser automation", () => {
    assert.throws(() => assertRegistrySourceUsable({
      id: "browser",
      name: "Browser source",
      kind: "business-registry",
      jurisdiction: { country: "US", state: "CA" },
      officialUrl: "https://example.gov/search",
      accessMethod: "browser",
      capabilities: ["name-search"],
      enabled: true,
    }), /robots and terms review/);
  });

  test("normalizes artifact timestamps, newlines, and metadata ordering", () => {
    const artifact = normalizeRegistryArtifact({
      sourceId: "source",
      sourceUrl: "https://example.gov/r/1",
      retrievedAt: "2026-09-17T12:00:00-07:00",
      contentType: "text/plain",
      content: "a\r\nb",
      metadata: { z: "2", a: "1" },
    });
    assert.equal(artifact.content, "a\nb");
    assert.deepEqual(Object.keys(artifact.metadata ?? {}), ["a", "z"]);
    assert.match(artifact.retrievedAt, /Z$/);
  });
});
