import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type Relationship,
  type IntelligenceType,
  createRelationship,
  verifyRelationship,
  retractRelationship,
  validateRelationship,
  isDuplicate,
  deduplicateRelationships,
  relationshipsFrom,
  relationshipsTo,
  relationshipsOfType,
  traverseBFS,
  MAX_RELATIONSHIP_TYPE_LENGTH,
  createId,
  createProvenance,
  PROVENANCE_STRENGTH,
  type SourceRef,
  createSourceRef,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Relationship", () => {
  // ── Creation ────────────────────────────────────────────────────────────────
  test("creates a directed relationship between entities", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "entity-001",
      toType: "entity",
      toId: "entity-002",
      type: "issued",
      provenance: { level: "document_extracted" },
    });
    assert.ok(rel.id);
    assert.equal(rel.fromType, "entity");
    assert.equal(rel.fromId, "entity-001");
    assert.equal(rel.toType, "entity");
    assert.equal(rel.toId, "entity-002");
    assert.equal(rel.type, "issued");
    assert.equal(rel.status, "active");
    assert.equal(rel.verified, false);
  });

  test("creates a relationship with metadata", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "agency-001",
      toType: "entity",
      toId: "notice-001",
      type: "issued",
      metadata: { method: "mail", date: "2026-01-15" },
      provenance: { level: "user_provided" },
      confidence: 0.9,
    });
    assert.equal(rel.metadata.method, "mail");
    assert.equal(rel.confidence, 0.9);
  });

  test("creates a relationship with source references", () => {
    const ref: SourceRef = createSourceRef({
      documentId: createId("doc-001"),
      documentName: "decision.pdf",
      page: 5,
    });
    const rel = createRelationship({
      fromType: "entity",
      fromId: "agency-001",
      toType: "entity",
      toId: "notice-001",
      type: "issued",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });
    assert.equal(rel.provenance.sourceRefs.length, 1);
    assert.equal(rel.provenance.sourceRefs[0]!.page, 5);
  });

  test("creates cross-type relationships (entity → fact)", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "person-001",
      toType: "fact",
      toId: "fact-001",
      type: "subject_of",
      provenance: { level: "user_provided" },
    });
    assert.equal(rel.fromType, "entity");
    assert.equal(rel.toType, "fact");
  });

  // ── Validation ───────────────────────────────────────────────────────────────
  test("rejects empty fromId", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "",
        toType: "entity",
        toId: "entity-002",
        type: "issued",
        provenance: { level: "user_provided" },
      }),
      /fromId must not be empty/,
    );
  });

  test("rejects empty toId", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "entity-001",
        toType: "entity",
        toId: "",
        type: "issued",
        provenance: { level: "user_provided" },
      }),
      /toId must not be empty/,
    );
  });

  test("rejects empty relationship type", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "entity-001",
        toType: "entity",
        toId: "entity-002",
        type: "",
        provenance: { level: "user_provided" },
      }),
      /type must not be empty/,
    );
  });

  test("rejects self-relationship", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "entity-001",
        toType: "entity",
        toId: "entity-001",
        type: "related_to",
        provenance: { level: "user_provided" },
      }),
      /itself/,
    );
  });

  test("rejects type exceeding max length", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "entity-001",
        toType: "entity",
        toId: "entity-002",
        type: "x".repeat(MAX_RELATIONSHIP_TYPE_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
      /type must not exceed/,
    );
  });

  test("validateRelationship returns ok for valid relationship", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "entity-001",
      toType: "entity",
      toId: "entity-002",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    const result = validateRelationship(rel);
    assert.ok(result.ok);
  });

  test("validateRelationship returns error for self-relationship", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "entity-001",
      toType: "fact",
      toId: "entity-001",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    // Different types, same ID is allowed
    const result = validateRelationship(rel);
    assert.ok(result.ok);
  });

  // ── Verification ──────────────────────────────────────────────────────────────
  test("verifyRelationship upgrades to human_verified", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "entity-001",
      toType: "entity",
      toId: "entity-002",
      type: "issued",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(rel.verified, false);

    const verified = verifyRelationship(rel, "admin@example.com");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
  });

  // ── Retraction ───────────────────────────────────────────────────────────────
  test("retractRelationship marks as retracted", () => {
    const rel = createRelationship({
      fromType: "entity",
      fromId: "entity-001",
      toType: "entity",
      toId: "entity-002",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    const retracted = retractRelationship(rel);
    assert.equal(retracted.status, "retracted");
  });

  // ── Duplicate Detection ───────────────────────────────────────────────────────
  test("isDuplicate detects same from/to/type", () => {
    const a = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    const b = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "document_extracted" },
    });
    assert.ok(isDuplicate(a, b));
  });

  test("isDuplicate returns false for different type", () => {
    const a = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    const b = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "received",
      provenance: { level: "user_provided" },
    });
    assert.ok(!isDuplicate(a, b));
  });

  test("isDuplicate returns false for reversed direction", () => {
    const a = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    const b = createRelationship({
      fromType: "entity",
      fromId: "e2",
      toType: "entity",
      toId: "e1",
      type: "issued",
      provenance: { level: "user_provided" },
    });
    assert.ok(!isDuplicate(a, b));
  });

  test("deduplicateRelationships keeps strongest provenance", () => {
    const aiRel = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const docRel = createRelationship({
      fromType: "entity",
      fromId: "e1",
      toType: "entity",
      toId: "e2",
      type: "issued",
      provenance: { level: "document_extracted" },
    });
    const result = deduplicateRelationships([aiRel, docRel]);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.provenance.level, "document_extracted");
  });

  test("deduplicateRelationships keeps non-duplicates", () => {
    const r1 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "user_provided" } });
    const r2 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e3", type: "issued", provenance: { level: "user_provided" } });
    const result = deduplicateRelationships([r1, r2]);
    assert.equal(result.length, 2);
  });

  test("deduplicateRelationships excludes retracted", () => {
    const active = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "user_provided" } });
    const retracted = retractRelationship(createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "document_extracted" } }));
    const result = deduplicateRelationships([active, retracted]);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.status, "active");
  });

  // ── Graph Traversal ───────────────────────────────────────────────────────────
  test("relationshipsFrom returns outgoing relationships", () => {
    const r1 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "user_provided" } });
    const r2 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e3", type: "received", provenance: { level: "user_provided" } });
    const r3 = createRelationship({ fromType: "entity", fromId: "e2", toType: "entity", toId: "e3", type: "sent", provenance: { level: "user_provided" } });
    const from = relationshipsFrom([r1, r2, r3], "entity", createId("e1"));
    assert.equal(from.length, 2);
  });

  test("relationshipsTo returns incoming relationships", () => {
    const r1 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e3", type: "issued", provenance: { level: "user_provided" } });
    const r2 = createRelationship({ fromType: "entity", fromId: "e2", toType: "entity", toId: "e3", type: "sent", provenance: { level: "user_provided" } });
    const r3 = createRelationship({ fromType: "entity", fromId: "e3", toType: "entity", toId: "e4", type: "received", provenance: { level: "user_provided" } });
    const to = relationshipsTo([r1, r2, r3], "entity", createId("e3"));
    assert.equal(to.length, 2);
  });

  test("relationshipsOfType filters by type", () => {
    const r1 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "user_provided" } });
    const r2 = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e3", type: "received", provenance: { level: "user_provided" } });
    const result = relationshipsOfType([r1, r2], "issued");
    assert.equal(result.length, 1);
  });

  test("traverseBFS walks the graph from a starting node", () => {
    const rels = [
      createRelationship({ fromType: "entity", fromId: "A", toType: "entity", toId: "B", type: "issued", provenance: { level: "user_provided" } }),
      createRelationship({ fromType: "entity", fromId: "B", toType: "entity", toId: "C", type: "sent", provenance: { level: "user_provided" } }),
      createRelationship({ fromType: "entity", fromId: "C", toType: "entity", toId: "D", type: "received", provenance: { level: "user_provided" } }),
    ];
    const visited = traverseBFS(rels, "entity", createId("A"), 10);
    assert.equal(visited.length, 4); // A, B, C, D
    assert.equal(visited[0]!.id, "A");
    assert.equal(visited[1]!.id, "B");
    assert.equal(visited[2]!.id, "C");
    assert.equal(visited[3]!.id, "D");
  });

  test("traverseBFS handles cycles", () => {
    const rels = [
      createRelationship({ fromType: "entity", fromId: "A", toType: "entity", toId: "B", type: "issued", provenance: { level: "user_provided" } }),
      createRelationship({ fromType: "entity", fromId: "B", toType: "entity", toId: "A", type: "replied", provenance: { level: "user_provided" } }),
    ];
    const visited = traverseBFS(rels, "entity", createId("A"), 10);
    assert.equal(visited.length, 2); // A, B (no revisits)
  });

  test("traverseBFS respects max depth", () => {
    const rels = [
      createRelationship({ fromType: "entity", fromId: "A", toType: "entity", toId: "B", type: "issued", provenance: { level: "user_provided" } }),
      createRelationship({ fromType: "entity", fromId: "B", toType: "entity", toId: "C", type: "sent", provenance: { level: "user_provided" } }),
      createRelationship({ fromType: "entity", fromId: "C", toType: "entity", toId: "D", type: "received", provenance: { level: "user_provided" } }),
    ];
    const visited = traverseBFS(rels, "entity", createId("A"), 2);
    assert.equal(visited.length, 3); // A(0), B(1), C(2) — D is at depth 3
  });

  test("traverseBFS excludes retracted relationships", () => {
    const active = createRelationship({ fromType: "entity", fromId: "A", toType: "entity", toId: "B", type: "issued", provenance: { level: "user_provided" } });
    const retracted = retractRelationship(
      createRelationship({ fromType: "entity", fromId: "B", toType: "entity", toId: "C", type: "sent", provenance: { level: "user_provided" } }),
    );
    const visited = traverseBFS([active, retracted], "entity", createId("A"), 10);
    assert.equal(visited.length, 2); // A, B — C unreachable via retracted edge
  });

  // ── Provenance ───────────────────────────────────────────────────────────────
  test("AI-inferred relationship requires modelId", () => {
    assert.throws(
      () => createRelationship({
        fromType: "entity",
        fromId: "e1",
        toType: "entity",
        toId: "e2",
        type: "related_to",
        provenance: { level: "ai_inferred" },
      }),
      /AI-inferred provenance requires a modelId/,
    );
  });

  test("document_extracted relationship has stronger provenance than ai_inferred", () => {
    const aiRel = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "ai_inferred", modelId: "claude-4" } });
    const docRel = createRelationship({ fromType: "entity", fromId: "e1", toType: "entity", toId: "e2", type: "issued", provenance: { level: "document_extracted" } });
    assert.ok(PROVENANCE_STRENGTH[docRel.provenance.level] > PROVENANCE_STRENGTH[aiRel.provenance.level]);
  });
});
