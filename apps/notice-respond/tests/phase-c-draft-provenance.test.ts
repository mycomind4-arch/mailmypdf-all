/**
 * Phase C — Draft Provenance Persistence
 *
 * Regression tests proving:
 * 1. Draft provenance is computed from draft text + facts and persists with the case
 * 2. Provenance survives request boundaries (save → load → verify)
 * 3. Blocking assertions are tracked and prevent approval
 * 4. Cross-owner cannot read or write provenance
 * 5. Provenance is recomputed when the draft changes
 * 6. Serialization round-trips provenance correctly
 * 7. Empty/undefined provenance is handled gracefully
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createCase,
  updateCase,
  serializeCase,
  deserializeCase,
  type NoticeCase,
} from "../src/domain/notice";
import {
  buildDraftProvenance,
  type DraftProvenance,
} from "../src/domain/draft-provenance";
import { InMemoryCaseRepository } from "../src/platform/in-memory-repository";

// ── Helpers ──

function makeCaseWithDraft(ownerId: string, draftText: string, facts: { id: string; value: string; label: string }[] = []): NoticeCase {
  let c = createCase("cp2000-response");
  c.ownerId = ownerId;
  c.finalResponse = draftText;
  c.facts = facts as any;
  const provenance = buildDraftProvenance(draftText, facts as any, []);
  c.draftProvenance = provenance;
  return c;
}

// ── Tests ──

describe("Phase C — Draft Provenance Persistence", () => {

  it("Phase C: provenance is computed and stored on the case", () => {
    const facts = [
      { id: "f1", value: "$1,234.56", label: "Proposed tax increase", sourceExcerpt: "The proposed increase is $1,234.56" },
    ];
    const draftText = "I disagree with the proposed increase of $1,234.56. Please abate this assessment.";
    const c = makeCaseWithDraft("owner-a", draftText, facts);

    assert.ok(c.draftProvenance, "Case must have draftProvenance");
    const prov = c.draftProvenance as DraftProvenance;
    assert.ok(prov.assertions.length > 0, "Must have assertions");
    assert.ok(prov.supported > 0, "At least one assertion must be supported");
    assert.equal(prov.unsupported, 0, "No unsupported assertions when facts match");
    assert.equal(prov.safeForApproval, true, "Draft with all supported assertions is safe for approval");
  });

  it("Phase C: provenance survives request boundary (save → load)", async () => {
    const repo = new InMemoryCaseRepository();
    const facts = [
      { id: "f1", value: "$5,000.00", label: "Disputed amount", sourceExcerpt: "Amount owed: $5,000.00" },
      { id: "f2", value: "January 15, 2024", label: "Notice date", sourceExcerpt: "Date of notice: January 15, 2024" },
    ];
    const draftText = "I am responding to the notice dated January 15, 2024. I dispute the amount of $5,000.00.";

    const c = makeCaseWithDraft("owner-a", draftText, facts);
    await repo.save(c);

    const loaded = await repo.load(c.id, "owner-a");
    assert.ok(loaded, "Case must load");
    assert.ok(loaded!.draftProvenance, "Loaded case must have draftProvenance");

    const origProv = c.draftProvenance as DraftProvenance;
    const loadedProv = loaded!.draftProvenance as DraftProvenance;

    assert.equal(loadedProv.assertions.length, origProv.assertions.length, "Assertion count must match");
    assert.equal(loadedProv.supported, origProv.supported, "Supported count must match");
    assert.equal(loadedProv.unsupported, origProv.unsupported, "Unsupported count must match");
    assert.equal(loadedProv.blocking, origProv.blocking, "Blocking count must match");
    assert.equal(loadedProv.safeForApproval, origProv.safeForApproval, "safeForApproval must match");
  });

  it("Phase C: blocking assertions are tracked and prevent approval", () => {
    // Draft with an unresolved placeholder → blocking assertion
    const draftText = "I disagree with the assessment. [TAXPAYER_NAME] should not owe this amount.";
    const facts: any[] = [];

    const c = makeCaseWithDraft("owner-a", draftText, facts);
    const prov = c.draftProvenance as DraftProvenance;

    assert.ok(prov.placeholders > 0, "Must detect placeholder");
    assert.ok(prov.blocking > 0, "Must have blocking assertions");
    assert.equal(prov.safeForApproval, false, "Draft with placeholders is NOT safe for approval");
  });

  it("Phase C: unsupported amounts are flagged but not blocking", () => {
    const draftText = "I dispute the amount of $9,999.99.";
    const facts = [
      { id: "f1", value: "$5,000.00", label: "Disputed amount", sourceExcerpt: "Amount owed: $5,000.00" },
    ];

    const c = makeCaseWithDraft("owner-a", draftText, facts);
    const prov = c.draftProvenance as DraftProvenance;

    assert.ok(prov.unsupported > 0, "Amount not in facts must be unsupported");
    // Unsupported amounts are not blocking (only placeholders and missing notice numbers are)
    assert.equal(prov.safeForApproval, false, "Draft with unsupported assertions is NOT safe for approval");
  });

  it("Phase C: cross-owner cannot read provenance", async () => {
    const repo = new InMemoryCaseRepository();
    const facts = [
      { id: "f1", value: "$3,000.00", label: "Disputed amount", sourceExcerpt: "Amount: $3,000.00" },
    ];
    const draftText = "I dispute the $3,000.00 assessment.";
    const c = makeCaseWithDraft("owner-a", draftText, facts);
    await repo.save(c);

    // Owner B loads → null (not found)
    const loaded = await repo.load(c.id, "owner-b");
    assert.equal(loaded, null, "Cross-owner load must return null — no provenance leak");
  });

  it("Phase C: cross-owner cannot write provenance", async () => {
    const repo = new InMemoryCaseRepository();
    const facts = [
      { id: "f1", value: "$2,000.00", label: "Amount", sourceExcerpt: "Amount: $2,000.00" },
    ];
    const draftText = "I dispute the $2,000.00 amount.";
    const c = makeCaseWithDraft("owner-a", draftText, facts);
    await repo.save(c);

    // Owner B tries to load and overwrite provenance
    const ownerBCase = await repo.load(c.id, "owner-b");
    assert.equal(ownerBCase, null, "Cross-owner cannot load case to overwrite provenance");

    // Even if owner B tries to save with the case ID, it creates a separate entry
    const forgedCase = createCase("cp2000-response");
    forgedCase.id = c.id;
    forgedCase.ownerId = "owner-b";
    forgedCase.finalResponse = "tampered draft";
    forgedCase.draftProvenance = buildDraftProvenance("tampered", [], []);
    await repo.save(forgedCase);

    // Owner A's case is unchanged
    const ownerACase = await repo.load(c.id, "owner-a");
    assert.ok(ownerACase, "Owner A's case must still exist");
    assert.equal(ownerACase!.finalResponse, draftText, "Owner A's draft must be unchanged");
    const origProv = c.draftProvenance as DraftProvenance;
    const ownerAProv = ownerACase!.draftProvenance as DraftProvenance;
    assert.equal(ownerAProv.supported, origProv.supported, "Owner A's provenance must be unchanged");
  });

  it("Phase C: provenance is recomputed when draft changes", async () => {
    const repo = new InMemoryCaseRepository();
    const facts = [
      { id: "f1", value: "$1,000.00", label: "Amount", sourceExcerpt: "Amount: $1,000.00" },
    ];

    // Initial draft with supported amount
    const draft1 = "I dispute the $1,000.00 assessment.";
    const c = makeCaseWithDraft("owner-a", draft1, facts);
    await repo.save(c);

    const prov1 = (await repo.load(c.id, "owner-a"))!.draftProvenance as DraftProvenance;
    assert.equal(prov1.supported, 1, "Initial draft: 1 supported assertion");
    assert.equal(prov1.unsupported, 0, "Initial draft: 0 unsupported");

    // Updated draft with different unsupported amount
    const draft2 = "I dispute the $8,888.88 assessment.";
    const newProvenance = buildDraftProvenance(draft2, facts as any, []);
    const updated = updateCase(c, {
      finalResponse: draft2,
      draftProvenance: newProvenance,
    });
    await repo.save(updated);

    const prov2 = (await repo.load(c.id, "owner-a"))!.draftProvenance as DraftProvenance;
    assert.equal(prov2.unsupported, 1, "Updated draft: 1 unsupported assertion (new amount not in facts)");
    assert.equal(prov2.supported, 0, "Updated draft: 0 supported (old amount no longer in draft)");
    assert.notEqual(prov2.safeForApproval, prov1.safeForApproval, "Approval safety must change when draft changes");
  });

  it("Phase C: serialization round-trips provenance correctly", () => {
    const facts = [
      { id: "f1", value: "$7,500.00", label: "Disputed amount", sourceExcerpt: "Amount: $7,500.00" },
      { id: "f2", value: "March 1, 2024", label: "Deadline", sourceExcerpt: "Respond by March 1, 2024" },
    ];
    const draftText = "I dispute the $7,500.00 amount. The deadline is March 1, 2024.";
    const c = makeCaseWithDraft("owner-a", draftText, facts);

    const serialized = serializeCase(c);
    assert.ok(serialized.draftProvenance, "Serialized case must have draftProvenance");

    const deserialized = deserializeCase(serialized as any);
    assert.ok(deserialized.draftProvenance, "Deserialized case must have draftProvenance");

    const origProv = c.draftProvenance as DraftProvenance;
    const deserProv = deserialized.draftProvenance as DraftProvenance;

    assert.equal(deserProv.assertions.length, origProv.assertions.length, "Assertion count must survive round-trip");
    assert.equal(deserProv.supported, origProv.supported, "Supported count must survive round-trip");
    assert.equal(deserProv.unsupported, origProv.unsupported, "Unsupported count must survive round-trip");
    assert.equal(deserProv.blocking, origProv.blocking, "Blocking count must survive round-trip");
    assert.equal(deserProv.safeForApproval, origProv.safeForApproval, "safeForApproval must survive round-trip");
  });

  it("Phase C: empty/undefined provenance is handled gracefully", () => {
    const c = createCase("cp2000-response");
    c.ownerId = "owner-a";
    c.finalResponse = "Some draft text.";
    // No draftProvenance set

    assert.equal(c.draftProvenance, undefined, "Provenance defaults to undefined");

    // Serialization should handle undefined provenance
    const serialized = serializeCase(c);
    assert.ok(!serialized.draftProvenance, "Serialized undefined provenance stays falsy");

    const deserialized = deserializeCase(serialized as any);
    assert.equal(deserialized.draftProvenance, undefined, "Deserialized undefined provenance stays undefined");
  });

  it("Phase C: provenance with all assertion types survives request boundary", async () => {
    const repo = new InMemoryCaseRepository();
    const facts = [
      { id: "f1", value: "$4,200.00", label: "Assessment amount", sourceExcerpt: "Amount due: $4,200.00" },
      { id: "f2", value: "April 30, 2024", label: "Response deadline", sourceExcerpt: "Respond by April 30, 2024" },
      { id: "f3", value: "CP2000", label: "Notice number", sourceExcerpt: "Notice CP2000" },
    ];
    const draftText = `I am responding to notice CP2000-1234-567890. I dispute the assessment of $4,200.00. The deadline is April 30, 2024. [TAXPAYER_NAME]`;

    const c = makeCaseWithDraft("owner-a", draftText, facts);
    await repo.save(c);

    const loaded = await repo.load(c.id, "owner-a");
    assert.ok(loaded, "Case must load");
    const prov = loaded!.draftProvenance as DraftProvenance;

    assert.ok(prov.assertions.length >= 4, "Must have assertions for amount, date, notice number, and placeholder");
    assert.ok(prov.supported >= 2, "At least 2 supported (amount + date)");
    assert.ok(prov.placeholders >= 1, "Must detect placeholder");
    assert.ok(prov.blocking >= 1, "Placeholder must be blocking");
    assert.equal(prov.safeForApproval, false, "Draft with placeholder is NOT safe for approval");
  });
});
