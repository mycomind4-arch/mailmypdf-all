import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createUccSearchResult,
  summarizeUccSearchCoverage,
} from "../rules/ucc-search";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Pre-Filing Lien & Priority Search workflow", () => {
  test("no-hit search output cannot be treated as conclusive absence", () => {
    const result = createUccSearchResult({
      rawRecords: [],
      provenance: {
        provider: "synthetic",
        jurisdiction: "TEST-1",
        queriedAt: "2026-09-17T20:00:00Z",
        query: "EXAMPLE",
      },
      complete: true,
    });
    assert.equal(summarizeUccSearchCoverage(result).noHitConclusive, false);
  });

  test("search workflow remains non-consequential", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
