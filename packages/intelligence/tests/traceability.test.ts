import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinding,
  createRelationship,
  traceFindingDerivation,
  traceRelationships,
  traceSources,
} from "../src/index.js";

test("finding derivation exposes canonical fact, evidence, contradiction, and entity refs", () => {
  const finding = createFinding({
    id: "finding-1",
    findingType: "deadline-risk",
    severity: "major",
    factIds: ["fact-1"],
    evidenceIds: ["evidence-1"],
    contradictionIds: ["contradiction-1"],
    entityIds: ["entity-1"],
    provenance: { level: "rule_derived", ruleId: "test-rule" },
  });

  const trace = traceFindingDerivation(finding);
  assert.deepEqual(trace.facts, [{ type: "fact", id: "fact-1" }]);
  assert.deepEqual(trace.evidence, [{ type: "evidence", id: "evidence-1" }]);
  assert.deepEqual(trace.contradictions, [{ type: "contradiction", id: "contradiction-1" }]);
  assert.deepEqual(trace.entities, [{ type: "entity", id: "entity-1" }]);
  assert.equal(trace.all.length, 4);
});

test("relationship trace shows immediate sources and targets without inventing links", () => {
  const issued = createRelationship({
    id: "rel-issued",
    fromType: "entity",
    fromId: "agency-1",
    toType: "document",
    toId: "notice-1",
    type: "issued",
    provenance: { level: "document_extracted" },
  });
  const supports = createRelationship({
    id: "rel-supports",
    fromType: "document",
    fromId: "notice-1",
    toType: "fact",
    toId: "fact-1",
    type: "supports",
    provenance: { level: "document_extracted" },
  });

  const trace = traceRelationships([issued, supports], {
    type: "document",
    id: "notice-1",
  });

  assert.deepEqual(trace.sources, [{ type: "entity", id: "agency-1" }]);
  assert.deepEqual(trace.targets, [{ type: "fact", id: "fact-1" }]);
});

test("source tracing walks backwards through active relationships and handles cycles", () => {
  const relationships = [
    createRelationship({
      id: "rel-1",
      fromType: "document",
      fromId: "notice-1",
      toType: "fact",
      toId: "fact-1",
      type: "supports",
      provenance: { level: "document_extracted" },
    }),
    createRelationship({
      id: "rel-2",
      fromType: "fact",
      fromId: "fact-1",
      toType: "finding",
      toId: "finding-1",
      type: "produces",
      provenance: { level: "rule_derived", ruleId: "rule-1" },
    }),
    createRelationship({
      id: "rel-3",
      fromType: "finding",
      fromId: "finding-1",
      toType: "document",
      toId: "notice-1",
      type: "references",
      provenance: { level: "user_provided" },
    }),
  ];

  const sources = traceSources(
    relationships,
    { type: "finding", id: "finding-1" },
    8,
  );

  assert.deepEqual(sources, [
    { type: "fact", id: "fact-1" },
    { type: "document", id: "notice-1" },
  ]);
});
