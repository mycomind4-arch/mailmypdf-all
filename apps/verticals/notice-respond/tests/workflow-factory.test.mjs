import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_REGISTRY,
  computePriorityScore,
} from "../src/domain/workflow-definition.ts";

import {
  WORKFLOW_REGISTRY,
  registryByEngine,
  registryByVertical,
  registryById,
  registryStats,
} from "../src/domain/workflow-master-registry.ts";

import {
  noticeRespondCatalog,
} from "../src/domain/workflow-catalog.ts";

const expectedEngines = ["document-action", "dispute", "records", "appeal", "jurisdictional"];

// ═══ Engine Registry Tests ═══

for (const engineId of expectedEngines) {
  test(`ENGINE_REGISTRY contains engine: ${engineId}`, () => {
    assert.ok(ENGINE_REGISTRY[engineId], `Engine ${engineId} not found in registry`);
    assert.ok(ENGINE_REGISTRY[engineId].name, `Engine ${engineId} missing name`);
    assert.ok(ENGINE_REGISTRY[engineId].description, `Engine ${engineId} missing description`);
    assert.ok(ENGINE_REGISTRY[engineId].pipeline.length > 0, `Engine ${engineId} has no pipeline`);
    assert.ok(ENGINE_REGISTRY[engineId].usedBy.length > 0, `Engine ${engineId} has no consumers`);
    assert.ok(ENGINE_REGISTRY[engineId].sharedCapabilities.length > 0, `Engine ${engineId} has no shared capabilities`);
  });
}

test("ENGINE_REGISTRY has exactly 5 engines", () => {
  assert.equal(Object.keys(ENGINE_REGISTRY).length, 5);
});

test("Every engine pipeline has at least 3 steps", () => {
  for (const [id, engine] of Object.entries(ENGINE_REGISTRY)) {
    assert.ok(engine.pipeline.length >= 3, `Engine ${id} pipeline too short: ${engine.pipeline.length}`);
  }
});

// ═══ Master Registry Tests ═══

test("WORKFLOW_REGISTRY is non-empty", () => {
  assert.ok(WORKFLOW_REGISTRY.length > 0, "Registry is empty");
});

test("Every registry entry has required fields", () => {
  const requiredFields = [
    "id", "vertical", "category", "engine", "lifecycle", "title",
    "canonicalKeyword", "keywordCluster", "seoUrl", "repo",
    "productStatus", "testStatus", "deploymentStatus",
    "factoryReuseScore", "implementationDifficulty", "priority", "researchRequired",
  ];
  for (const entry of WORKFLOW_REGISTRY) {
    for (const field of requiredFields) {
      assert.ok(entry[field] !== undefined, `Entry ${entry.id} missing field ${field}`);
    }
  }
});

test("Registry IDs are unique", () => {
  const ids = WORKFLOW_REGISTRY.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "Duplicate workflow IDs in registry");
});

test("Registry SEO URLs are unique", () => {
  const urls = WORKFLOW_REGISTRY.map((e) => e.seoUrl);
  assert.equal(new Set(urls).size, urls.length, "Duplicate SEO URLs in registry");
});

test("Every registry entry has a valid engine", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    assert.ok(
      expectedEngines.includes(entry.engine),
      `Entry ${entry.id} has invalid engine: ${entry.engine}`,
    );
  }
});

test("Every registry entry has a valid lifecycle", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    assert.ok(
      ["blueprint", "functional", "authority"].includes(entry.lifecycle),
      `Entry ${entry.id} has invalid lifecycle: ${entry.lifecycle}`,
    );
  }
});

test("Keyword metrics are never fabricated — MSV is null or a verified number", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.msv !== null) {
      assert.ok(entry.msv > 0, `Entry ${entry.id} has invalid MSV: ${entry.msv}`);
    }
    if (entry.msv === null || entry.cpc === null || entry.competition === null) {
      assert.ok(entry.researchRequired, `Entry ${entry.id} should have researchRequired=true`);
    }
  }
});

test("No registry entry claims authority without passing tests", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "authority") {
      assert.equal(entry.testStatus, "passing", `Authority workflow ${entry.id} does not have passing tests`);
      assert.equal(entry.productStatus, "authority", `Authority workflow ${entry.id} does not have authority product status`);
    }
  }
});

test("Blueprint workflows are not deployed to production", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "blueprint") {
      assert.notEqual(entry.deploymentStatus, "production",
        `Blueprint workflow ${entry.id} should not be in production`);
    }
  }
});

test("Functional workflows have passing tests", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "functional" && entry.productStatus === "functional") {
      assert.equal(entry.testStatus, "passing", `Functional workflow ${entry.id} does not have passing tests`);
    }
  }
});

// ═══ Registry Lookup Tests ═══

test("registryByEngine groups entries by engine", () => {
  for (const engine of expectedEngines) {
    assert.ok(registryByEngine[engine], `No entries for engine ${engine}`);
    assert.ok(registryByEngine[engine].length > 0, `Engine ${engine} has no workflows`);
  }
});

test("registryByVertical groups entries by vertical", () => {
  assert.ok(registryByVertical["notice-respond"], "No notice-respond entries");
  assert.ok(registryByVertical["notice-respond"].length > 0, "notice-respond has no workflows");
});

test("registryById returns correct entries", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    assert.ok(registryById[entry.id], `registryById missing ${entry.id}`);
    assert.equal(registryById[entry.id].id, entry.id);
  }
});

test("registryStats returns correct totals", () => {
  const stats = registryStats();
  assert.equal(stats.total, WORKFLOW_REGISTRY.length);
  assert.ok(stats.byEngine["document-action"] > 0);
  assert.ok(stats.byEngine["dispute"] > 0);
  assert.ok(stats.byEngine["records"] > 0);
  assert.ok(stats.byEngine["appeal"] > 0);
  assert.ok(stats.byEngine["jurisdictional"] > 0);
});

// ═══ Priority Scoring Tests ═══

test("computePriorityScore calculates opportunity and factory value", () => {
  const score = computePriorityScore({
    searchDemand: 0.8,
    commercialValue: 0.7,
    intent: 0.9,
    reusability: 0.85,
    competitiveAdvantage: 0.6,
    implementationDifficulty: 3,
    workflowsUnlocked: 5,
  });
  assert.ok(score.opportunityScore > 0, "Opportunity score should be positive");
  assert.ok(score.factoryValue > 0, "Factory value should be positive");
  const harderScore = computePriorityScore({
    searchDemand: 0.8,
    commercialValue: 0.7,
    intent: 0.9,
    reusability: 0.85,
    competitiveAdvantage: 0.6,
    implementationDifficulty: 5,
    workflowsUnlocked: 5,
  });
  assert.ok(harderScore.opportunityScore < score.opportunityScore,
    "Higher difficulty should produce lower opportunity score");
});

test("computePriorityScore with zero search demand returns zero", () => {
  const score = computePriorityScore({
    searchDemand: 0,
    commercialValue: 0.7,
    intent: 0.9,
    reusability: 0.85,
    competitiveAdvantage: 0.6,
    implementationDifficulty: 3,
    workflowsUnlocked: 5,
  });
  assert.equal(score.opportunityScore, 0);
});

// ═══ Cross-Validation: Catalog vs Registry ═══

test("Every catalog workflow has a registry entry", () => {
  for (const workflow of noticeRespondCatalog) {
    const registryEntry = registryById[workflow.id];
    assert.ok(registryEntry, `Catalog workflow ${workflow.id} missing from master registry`);
    assert.equal(registryEntry.engine, workflow.engine,
      `Catalog/registry engine mismatch for ${workflow.id}`);
    assert.equal(registryEntry.lifecycle, workflow.lifecycle,
      `Catalog/registry lifecycle mismatch for ${workflow.id}`);
  }
});

test("Catalog workflows have the engine field", () => {
  for (const workflow of noticeRespondCatalog) {
    assert.ok(workflow.engine, `Workflow ${workflow.id} missing engine field`);
    assert.ok(
      expectedEngines.includes(workflow.engine),
      `Workflow ${workflow.id} has invalid engine: ${workflow.engine}`,
    );
  }
});

// ═══ Engine Specialization Tests ═══

test("Dispute engine workflows share the same pipeline", () => {
  const disputeWorkflows = registryByEngine["dispute"];
  for (const entry of disputeWorkflows) {
    assert.equal(entry.engine, "dispute");
    assert.ok(entry.factoryReuseScore >= 0.7,
      `${entry.id} has low reuse score: ${entry.factoryReuseScore}`);
  }
});

test("Every engine has at least 2 workflows", () => {
  const stats = registryStats();
  for (const engine of expectedEngines) {
    assert.ok(stats.byEngine[engine] >= 2,
      `Engine ${engine} has only ${stats.byEngine[engine]} workflows (expected >= 2)`);
  }
});

test("Credit dispute workflows are all in dispute-mail vertical", () => {
  const creditDisputes = WORKFLOW_REGISTRY.filter((e) => e.category === "Credit disputes");
  for (const entry of creditDisputes) {
    assert.equal(entry.vertical, "dispute-mail",
      `${entry.id} should be in dispute-mail vertical`);
    assert.equal(entry.engine, "dispute",
      `${entry.id} should use dispute engine`);
  }
});

test("Records workflows are all in records-requests vertical", () => {
  const recordsWorkflows = WORKFLOW_REGISTRY.filter((e) => e.engine === "records");
  for (const entry of recordsWorkflows) {
    assert.equal(entry.vertical, "records-requests",
      `${entry.id} should be in records-requests vertical`);
  }
});

// ═══ Maturity Model Tests ═══

test("Discovery/blueprint workflows do not claim production deployment", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "blueprint") {
      assert.notEqual(entry.deploymentStatus, "production",
        `Blueprint workflow ${entry.id} should not be deployed to production`);
      assert.notEqual(entry.productStatus, "authority",
        `Blueprint workflow ${entry.id} should not claim authority product status`);
    }
  }
});

test("Functional workflows have test coverage", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "functional") {
      assert.ok(entry.testStatus === "passing",
        `Functional workflow ${entry.id} should have passing tests`);
    }
  }
});

test("Authority workflows have all quality gates satisfied", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "authority") {
      assert.equal(entry.productStatus, "authority",
        `Authority workflow ${entry.id} should have authority product status`);
      assert.equal(entry.testStatus, "passing",
        `Authority workflow ${entry.id} should have passing tests`);
      assert.equal(entry.deploymentStatus, "production",
        `Authority workflow ${entry.id} should be deployed to production`);
    }
  }
});

// ═══ Canonical Ownership Tests ═══

test("No duplicate canonical keywords across verticals", () => {
  const keywordToVertical = {};
  for (const entry of WORKFLOW_REGISTRY) {
    const key = entry.canonicalKeyword.toLowerCase();
    if (keywordToVertical[key]) {
      assert.equal(keywordToVertical[key], entry.vertical,
        `Keyword "${entry.canonicalKeyword}" owned by both ${keywordToVertical[key]} and ${entry.vertical}`);
    }
    keywordToVertical[key] = entry.vertical;
  }
});

test("Debt Collection Dispute has one canonical owner", () => {
  const matches = WORKFLOW_REGISTRY.filter((e) => 
    e.canonicalKeyword.toLowerCase().includes("debt collection dispute"));
  assert.equal(matches.length, 1, 
    `Expected 1 owner of "debt collection dispute", found ${matches.length}`);
  assert.equal(matches[0].vertical, "dispute-mail");
});

test("Insurance Claim Denied has one canonical owner", () => {
  const matches = WORKFLOW_REGISTRY.filter((e) => 
    e.canonicalKeyword === "insurance claim denied");
  assert.equal(matches.length, 1,
    `Expected 1 owner of "insurance claim denied", found ${matches.length}`);
  assert.equal(matches[0].vertical, "appeal-mail");
});
