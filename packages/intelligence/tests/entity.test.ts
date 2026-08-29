import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type Entity,
  createEntity,
  verifyEntity,
  mergeEntity,
  deprecateEntity,
  validateEntity,
  addAlias,
  matchesName,
  findByType,
  MAX_ENTITY_NAME_LENGTH,
  MAX_ALIASES,
  createProvenance,
  createId,
  type SourceRef,
  createSourceRef,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Entity", () => {
  // ── Creation ────────────────────────────────────────────────────────────────
  test("creates an entity with required fields", () => {
    const entity = createEntity({
      type: "government_agency",
      name: "USCIS",
      provenance: { level: "user_provided" },
    });
    assert.ok(entity.id);
    assert.equal(entity.type, "government_agency");
    assert.equal(entity.name, "USCIS");
    assert.equal(entity.aliases.length, 0);
    assert.equal(entity.status, "active");
    assert.equal(entity.verified, false);
    assert.equal(entity.confidence, 0.5);
    assert.ok(entity.createdAt);
    assert.ok(entity.updatedAt);
  });

  test("creates an entity with aliases and metadata", () => {
    const entity = createEntity({
      type: "person",
      name: "John Smith",
      aliases: ["J. Smith", "Johnny Smith"],
      metadata: { role: "applicant" },
      provenance: { level: "document_extracted" },
      confidence: 0.8,
    });
    assert.equal(entity.aliases.length, 2);
    assert.equal(entity.aliases[0], "J. Smith");
    assert.equal(entity.metadata.role, "applicant");
    assert.equal(entity.confidence, 0.8);
  });

  test("creates entity with custom ID", () => {
    const entity = createEntity({
      id: "entity-custom-001",
      type: "organization",
      name: "Acme Corp",
      provenance: { level: "user_provided" },
    });
    assert.equal(entity.id, "entity-custom-001");
  });

  test("deduplicates aliases on creation", () => {
    const entity = createEntity({
      type: "person",
      name: "Jane Doe",
      aliases: ["J. Doe", "J. Doe", "Jane"],
      provenance: { level: "user_provided" },
    });
    assert.equal(entity.aliases.length, 2);
  });

  // ── Validation ───────────────────────────────────────────────────────────────
  test("rejects empty name", () => {
    assert.throws(
      () => createEntity({ type: "person", name: "", provenance: { level: "user_provided" } }),
      /name must not be empty/,
    );
  });

  test("rejects whitespace-only name", () => {
    assert.throws(
      () => createEntity({ type: "person", name: "   ", provenance: { level: "user_provided" } }),
      /name must not be empty/,
    );
  });

  test("rejects empty type", () => {
    assert.throws(
      () => createEntity({ type: "", name: "Test", provenance: { level: "user_provided" } }),
      /type must not be empty/,
    );
  });

  test("rejects name exceeding max length", () => {
    assert.throws(
      () => createEntity({ type: "person", name: "x".repeat(MAX_ENTITY_NAME_LENGTH + 1), provenance: { level: "user_provided" } }),
      /name must not exceed/,
    );
  });

  test("rejects too many aliases", () => {
    const aliases = Array.from({ length: MAX_ALIASES + 1 }, (_, i) => `alias${i}`);
    assert.throws(
      () => createEntity({ type: "person", name: "Test", aliases, provenance: { level: "user_provided" } }),
      /more than/,
    );
  });

  test("validateEntity returns ok for valid entity", () => {
    const entity = createEntity({
      type: "person",
      name: "Valid Entity",
      provenance: { level: "user_provided" },
    });
    const result = validateEntity(entity);
    assert.ok(result.ok);
  });

  test("validateEntity returns error for invalid entity", () => {
    const entity = createEntity({
      type: "person",
      name: "Test",
      provenance: { level: "user_provided" },
    });
    // Mutate to make invalid
    const invalid = { ...entity, name: "" } as Entity;
    const result = validateEntity(invalid);
    assert.ok(!result.ok);
  });

  // ── Provenance ───────────────────────────────────────────────────────────────
  test("entity provenance records source references", () => {
    const ref: SourceRef = createSourceRef({
      documentId: createId("doc-001"),
      documentName: "notice.pdf",
      page: 1,
    });
    const entity = createEntity({
      type: "government_agency",
      name: "USCIS",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });
    assert.equal(entity.provenance.sourceRefs.length, 1);
    assert.equal(entity.provenance.sourceRefs[0]!.documentId, "doc-001");
  });

  test("AI-inferred entity is not auto-verified", () => {
    const entity = createEntity({
      type: "government_agency",
      name: "Unknown Agency",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(entity.verified, false);
  });

  test("document_extracted entity is not auto-verified (verified flag only on human_verified)", () => {
    const entity = createEntity({
      type: "person",
      name: "John Smith",
      provenance: { level: "document_extracted" },
    });
    assert.equal(entity.verified, false);
  });

  // ── Verification ──────────────────────────────────────────────────────────────
  test("verifyEntity upgrades to human_verified", () => {
    const entity = createEntity({
      type: "person",
      name: "John Smith",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(entity.verified, false);

    const verified = verifyEntity(entity, "admin@example.com");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
    assert.equal(verified.provenance.verifiedBy, "admin@example.com");
    // Original is not mutated
    assert.equal(entity.verified, false);
  });

  // ── Alias Management ─────────────────────────────────────────────────────────
  test("addAlias adds a new alias", () => {
    const entity = createEntity({
      type: "person",
      name: "John Smith",
      provenance: { level: "user_provided" },
    });
    const updated = addAlias(entity, "J. Smith");
    assert.equal(updated.aliases.length, 1);
    assert.equal(updated.aliases[0], "J. Smith");
  });

  test("addAlias is idempotent", () => {
    const entity = createEntity({
      type: "person",
      name: "John Smith",
      aliases: ["J. Smith"],
      provenance: { level: "user_provided" },
    });
    const updated = addAlias(entity, "J. Smith");
    assert.equal(updated.aliases.length, 1);
  });

  test("addAlias rejects when max reached", () => {
    const aliases = Array.from({ length: MAX_ALIASES }, (_, i) => `a${i}`);
    const entity = createEntity({
      type: "person",
      name: "Test",
      aliases,
      provenance: { level: "user_provided" },
    });
    assert.throws(() => addAlias(entity, "new"), /maximum/);
  });

  // ── Matching ─────────────────────────────────────────────────────────────────
  test("matchesName matches by primary name", () => {
    const entity = createEntity({
      type: "person",
      name: "USCIS",
      aliases: ["U.S. Citizenship and Immigration Services"],
      provenance: { level: "user_provided" },
    });
    assert.ok(matchesName(entity, "USCIS"));
    assert.ok(matchesName(entity, "uscis"));
    assert.ok(matchesName(entity, "U.S. Citizenship and Immigration Services"));
    assert.ok(!matchesName(entity, "DOS"));
  });

  // ── findByType ───────────────────────────────────────────────────────────────
  test("findByType filters entities by type", () => {
    const entities = [
      createEntity({ type: "government_agency", name: "USCIS", provenance: { level: "user_provided" } }),
      createEntity({ type: "person", name: "John Smith", provenance: { level: "user_provided" } }),
      createEntity({ type: "government_agency", name: "DOS", provenance: { level: "user_provided" } }),
    ];
    const agencies = findByType(entities, "government_agency");
    assert.equal(agencies.length, 2);
  });

  // ── Status Management ────────────────────────────────────────────────────────
  test("mergeEntity combines aliases and metadata", () => {
    const source = createEntity({
      type: "person",
      name: "John Smith",
      aliases: ["J. Smith"],
      metadata: { role: "applicant" },
      provenance: { level: "user_provided" },
    });
    const target = createEntity({
      type: "person",
      name: "Jonathan Smith",
      aliases: ["Jon Smith"],
      metadata: { role: "petitioner", age: 35 },
      provenance: { level: "user_provided" },
    });
    const merged = mergeEntity(source, target);
    assert.equal(merged.name, "Jonathan Smith");
    assert.ok(merged.aliases.includes("J. Smith"));
    assert.ok(merged.aliases.includes("Jon Smith"));
    assert.ok(merged.aliases.includes("John Smith"));
    assert.equal(merged.metadata.role, "petitioner");
    assert.equal(merged.metadata.age, 35);
  });

  test("mergeEntity rejects merging entity into itself", () => {
    const entity = createEntity({
      type: "person",
      name: "Test",
      provenance: { level: "user_provided" },
    });
    assert.throws(() => mergeEntity(entity, entity), /itself/);
  });

  test("deprecateEntity changes status", () => {
    const entity = createEntity({
      type: "person",
      name: "Test",
      provenance: { level: "user_provided" },
    });
    const deprecated = deprecateEntity(entity);
    assert.equal(deprecated.status, "deprecated");
  });

  // ── Stable Identity ──────────────────────────────────────────────────────────
  test("entity ID is stable across modifications", () => {
    const entity = createEntity({
      type: "person",
      name: "John",
      provenance: { level: "user_provided" },
    });
    const originalId = entity.id;
    const withAlias = addAlias(entity, "Johnny");
    const verified = verifyEntity(withAlias, "admin@example.com");
    const deprecated = deprecateEntity(verified);
    assert.equal(deprecated.id, originalId);
  });
});
