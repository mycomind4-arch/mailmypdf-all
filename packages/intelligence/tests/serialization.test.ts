import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createEntity,
  createFact,
  createRelationship,
  verifyEntity,
  verifyFact,
  verifyRelationship,
  supersedeFact,
  type Entity,
  type Fact,
  type Relationship,
  createId,
  createSourceRef,
  traverseBFS,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION TESTS
//
// Intelligence objects are plain readonly TypeScript interfaces.
// They must survive JSON.stringify → JSON.parse round-trips without loss,
// since they'll be stored in databases, sent over APIs, and cached.
// ═══════════════════════════════════════════════════════════════════════════════

describe("Serialization", () => {
  test("entity survives JSON round-trip", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 2 });
    const entity = createEntity({
      id: "ser-entity",
      type: "government_agency",
      name: "USCIS",
      aliases: ["U.S. Citizenship and Immigration Services"],
      metadata: { category: "federal" },
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.95,
    });

    const json = JSON.stringify(entity);
    const restored = JSON.parse(json) as Entity;

    assert.equal(restored.id, entity.id);
    assert.equal(restored.type, entity.type);
    assert.equal(restored.name, entity.name);
    assert.equal(restored.aliases.length, 1);
    assert.equal(restored.aliases[0], "U.S. Citizenship and Immigration Services");
    assert.equal(restored.metadata.category, "federal");
    assert.equal(restored.provenance.level, "document_extracted");
    assert.equal(restored.provenance.sourceRefs.length, 1);
    assert.equal(restored.provenance.sourceRefs[0]!.page, 2);
    assert.equal(restored.confidence, 0.95);
    assert.equal(restored.verified, false);
    assert.equal(restored.status, "active");
  });

  test("verified entity survives JSON round-trip", () => {
    const entity = createEntity({
      id: "ser-verified",
      type: "person",
      name: "John Smith",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const verified = verifyEntity(entity, "admin@example.com");

    const json = JSON.stringify(verified);
    const restored = JSON.parse(json) as Entity;

    assert.equal(restored.verified, true);
    assert.equal(restored.provenance.level, "human_verified");
    assert.equal(restored.provenance.verifiedBy, "admin@example.com");
  });

  test("fact survives JSON round-trip", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "decision.pdf", page: 3 });
    const fact = createFact({
      id: "ser-fact",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.9,
    });

    const json = JSON.stringify(fact);
    const restored = JSON.parse(json) as Fact;

    assert.equal(restored.id, fact.id);
    assert.equal(restored.subject, "case-001");
    assert.equal(restored.predicate, "has_deadline");
    assert.equal(restored.value, "2026-09-15");
    assert.equal(restored.status, "active");
    assert.equal(restored.confidence, 0.9);
    assert.equal(restored.provenance.sourceRefs.length, 1);
    assert.equal(restored.provenance.sourceRefs[0]!.page, 3);
  });

  test("superseded fact survives JSON round-trip", () => {
    const old = createFact({
      id: "ser-old",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-08-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const newer = createFact({
      id: "ser-new",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted" },
    });
    const { old: superseded } = supersedeFact(old, newer);

    const json = JSON.stringify(superseded);
    const restored = JSON.parse(json) as Fact;

    assert.equal(restored.status, "superseded");
    assert.equal(restored.supersededBy, "ser-new");
    assert.equal(restored.value, "2026-08-15");
  });

  test("relationship survives JSON round-trip", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 1 });
    const rel = createRelationship({
      id: "ser-rel",
      fromType: "entity",
      fromId: "agency-001",
      toType: "entity",
      toId: "notice-001",
      type: "issued",
      metadata: { method: "certified_mail" },
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.88,
    });

    const json = JSON.stringify(rel);
    const restored = JSON.parse(json) as Relationship;

    assert.equal(restored.id, rel.id);
    assert.equal(restored.fromType, "entity");
    assert.equal(restored.fromId, "agency-001");
    assert.equal(restored.toType, "entity");
    assert.equal(restored.toId, "notice-001");
    assert.equal(restored.type, "issued");
    assert.equal(restored.metadata.method, "certified_mail");
    assert.equal(restored.confidence, 0.88);
    assert.equal(restored.provenance.sourceRefs.length, 1);
    assert.equal(restored.status, "active");
  });

  test("array of mixed objects survives JSON round-trip", () => {
    const entity = createEntity({
      id: "ser-mix-entity",
      type: "person",
      name: "Test Person",
      provenance: { level: "user_provided" },
    });
    const fact = createFact({
      id: "ser-mix-fact",
      subject: "ser-mix-entity",
      predicate: "has_name",
      value: "Test Person",
      provenance: { level: "user_provided" },
    });
    const rel = createRelationship({
      id: "ser-mix-rel",
      fromType: "entity",
      fromId: "ser-mix-entity",
      toType: "fact",
      toId: "ser-mix-fact",
      type: "subject_of",
      provenance: { level: "user_provided" },
    });

    const collection = { entities: [entity], facts: [fact], relationships: [rel] };
    const json = JSON.stringify(collection);
    const restored = JSON.parse(json) as {
      entities: Entity[];
      facts: Fact[];
      relationships: Relationship[];
    };

    assert.equal(restored.entities.length, 1);
    assert.equal(restored.facts.length, 1);
    assert.equal(restored.relationships.length, 1);
    assert.equal(restored.entities[0]!.name, "Test Person");
    assert.equal(restored.facts[0]!.value, "Test Person");
    assert.equal(restored.relationships[0]!.type, "subject_of");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE EXHAUSTION / TRAVERSAL SAFETY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Traversal Safety", () => {
  test("large graph with maxDepth=1 returns only direct neighbors", () => {
    const rels: Relationship[] = [];
    for (let i = 0; i < 1000; i++) {
      rels.push(
        createRelationship({
          fromType: "entity",
          fromId: `node-${i}`,
          toType: "entity",
          toId: `node-${i + 1}`,
          type: "next",
          provenance: { level: "user_provided" },
        }),
      );
    }
    const visited = traverseBFS(rels, "entity", createId("node-0"), 1);
    assert.equal(visited.length, 2); // node-0 (depth 0) + node-1 (depth 1)
  });

  test("maxDepth=0 returns only the starting node", () => {
    const rels = [
      createRelationship({ fromType: "entity", fromId: "A", toType: "entity", toId: "B", type: "issued", provenance: { level: "user_provided" } }),
    ];
    const visited = traverseBFS(rels, "entity", createId("A"), 0);
    assert.equal(visited.length, 1); // just A
  });

  test("traversal completes in reasonable time for 1000-node chain", () => {
    const rels: Relationship[] = [];
    for (let i = 0; i < 1000; i++) {
      rels.push(
        createRelationship({
          fromType: "entity",
          fromId: `n${i}`,
          toType: "entity",
          toId: `n${i + 1}`,
          type: "next",
          provenance: { level: "user_provided" },
        }),
      );
    }
    const start = Date.now();
    const visited = traverseBFS(rels, "entity", createId("n0"), 100);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `traversal took ${elapsed}ms`);
    assert.equal(visited.length, 101); // n0..n100
  });
});
