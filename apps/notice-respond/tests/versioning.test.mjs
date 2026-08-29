import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  createVersionedResponse,
  addVersion,
  finalizeVersion,
  getVersion,
  getCurrentVersion,
  getFinalVersion,
  getVersionHistory,
  recordCorrection,
} from "../src/domain/versioning.ts";

describe("Versioned Response Generation", () => {
  it("creates a versioned response container", () => {
    const vr = createVersionedResponse("case-1");
    assert.equal(vr.caseId, "case-1");
    assert.equal(vr.versions.length, 0);
    assert.equal(vr.currentVersionNumber, 0);
    assert.ok(vr.id);
  });

  it("adds versions with incrementing numbers", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Draft 1 content" });
    assert.equal(vr.versions.length, 1);
    assert.equal(vr.versions[0].versionNumber, 1);
    assert.equal(vr.currentVersionNumber, 1);

    vr = addVersion(vr, { content: "Draft 2 content" });
    assert.equal(vr.versions.length, 2);
    assert.equal(vr.versions[1].versionNumber, 2);
    assert.equal(vr.currentVersionNumber, 2);
  });

  it("preserves all versions when adding new ones", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Version 1" });
    vr = addVersion(vr, { content: "Version 2" });
    vr = addVersion(vr, { content: "Version 3" });
    assert.equal(vr.versions.length, 3);
    assert.equal(vr.versions[0].content, "Version 1");
    assert.equal(vr.versions[1].content, "Version 2");
    assert.equal(vr.versions[2].content, "Version 3");
  });

  it("tracks word count", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "One two three four five" });
    assert.equal(vr.versions[0].wordCount, 5);
  });

  it("tracks unresolved placeholders", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Draft with [placeholder]", unresolvedPlaceholders: 1 });
    assert.equal(vr.versions[0].unresolvedPlaceholders, 1);
  });

  it("tracks strategy and source facts", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, {
      content: "Draft",
      strategyType: "dispute_factual_allegation",
      strategyId: "strat-1",
      sourceFactIds: ["fact-1", "fact-2"],
    });
    assert.equal(vr.versions[0].strategyType, "dispute_factual_allegation");
    assert.equal(vr.versions[0].sourceFactIds.length, 2);
  });

  it("tracks change descriptions", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "V1", changeDescription: "Initial draft" });
    vr = addVersion(vr, { content: "V2", changeDescription: "Corrected amount" });
    assert.equal(vr.versions[0].changeDescription, "Initial draft");
    assert.equal(vr.versions[1].changeDescription, "Corrected amount");
  });

  it("finalizes a version", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Draft 1" });
    vr = addVersion(vr, { content: "Final draft" });
    vr = finalizeVersion(vr, vr.versions[1].id);
    assert.equal(vr.versions[0].isFinal, false);
    assert.equal(vr.versions[1].isFinal, true);
    assert.equal(vr.finalVersionId, vr.versions[1].id);
  });

  it("gets version by id", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Draft" });
    const found = getVersion(vr, vr.versions[0].id);
    assert.ok(found);
    assert.equal(found.content, "Draft");
  });

  it("gets current version", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "V1" });
    vr = addVersion(vr, { content: "V2" });
    const current = getCurrentVersion(vr);
    assert.ok(current);
    assert.equal(current.content, "V2");
  });

  it("gets final version", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "V1" });
    vr = addVersion(vr, { content: "V2" });
    vr = finalizeVersion(vr, vr.versions[1].id);
    const final = getFinalVersion(vr);
    assert.ok(final);
    assert.equal(final.content, "V2");
    assert.equal(final.isFinal, true);
  });

  it("generates version history", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "V1", changeDescription: "Initial" });
    vr = addVersion(vr, { content: "V2", changeDescription: "Revised" });
    const history = getVersionHistory(vr);
    assert.equal(history.length, 2);
    assert.equal(history[0].version, 1);
    assert.equal(history[1].version, 2);
    assert.equal(history[0].changeDescription, "Initial");
  });

  it("generates content hash for integrity", () => {
    let vr = createVersionedResponse("case-1");
    vr = addVersion(vr, { content: "Some content here" });
    assert.ok(vr.versions[0].contentHash);
    assert.match(vr.versions[0].contentHash, /^v1_/);
  });

  it("records corrections for self-improvement", () => {
    const correction = recordCorrection({
      type: "user_correction",
      field: "notice_date",
      original: "06/12/2026",
      corrected: "06/14/2026",
      reason: "User verified against page 1",
    });
    assert.equal(correction.type, "user_correction");
    assert.equal(correction.field, "notice_date");
    assert.equal(correction.original, "06/12/2026");
    assert.equal(correction.corrected, "06/14/2026");
    assert.ok(correction.id);
    assert.ok(correction.createdAt);
  });
});
