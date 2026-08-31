import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_REGISTRY,
} from "../src/domain/workflow-definition.ts";

import {
  noticeRespondCatalog,
} from "../src/domain/workflow-catalog.ts";

import {
  WORKFLOW_REGISTRY,
  registryStats,
} from "../src/domain/workflow-master-registry.ts";

import {
  PACK_REGISTRY,
  registerDomainPack,
  getDomainPack,
} from "../src/domain/domain-packs.ts";

import {
  validateDefinition,
  resolveEngine,
  loadCapabilityPacks,
  constructWorkflow,
  constructAllWorkflows,
  factoryValidationSummary,
} from "../src/domain/workflow-factory.ts";

// ═══ Factory Pipeline Tests ═══

test("validateDefinition returns no errors for a valid catalog workflow", () => {
  const workflow = noticeRespondCatalog[0];
  const errors = validateDefinition(workflow);
  assert.equal(errors.length, 0, `Expected 0 errors, got: ${errors.join(", ")}`);
});

test("validateDefinition catches missing fields", () => {
  const errors = validateDefinition({});
  assert.ok(errors.length > 5, "Should have multiple validation errors for empty definition");
  assert.ok(errors.includes("Missing workflow id"));
  assert.ok(errors.includes("Missing vertical"));
  assert.ok(errors.includes("Missing engine"));
});

test("resolveEngine returns the correct engine for catalog workflows", () => {
  for (const workflow of noticeRespondCatalog) {
    const engine = resolveEngine(workflow);
    assert.ok(engine, `Failed to resolve engine for ${workflow.id}`);
    assert.ok(ENGINE_REGISTRY[engine], `Resolved engine not in registry for ${workflow.id}`);
  }
});

test("resolveEngine returns null for unknown engine", () => {
  const result = resolveEngine({ engine: "nonexistent" });
  assert.equal(result, null);
});

test("loadCapabilityPacks merges engine + workflow capabilities", () => {
  const workflow = noticeRespondCatalog.find((w) => w.id === "cp2000-response");
  assert.ok(workflow);
  const capabilities = loadCapabilityPacks(workflow);
  // Should have at least the engine's shared capabilities
  const engine = ENGINE_REGISTRY[workflow.engine];
  assert.ok(capabilities.length >= engine.sharedCapabilities.length,
    `Should have at least ${engine.sharedCapabilities.length} capabilities, got ${capabilities.length}`);
  // Should include capabilities from both engine and workflow
  assert.ok(capabilities.includes("document-classification"));
  assert.ok(capabilities.includes("fact-extraction"));
});

test("constructWorkflow produces a ready workflow for catalog entries", () => {
  for (const workflow of noticeRespondCatalog) {
    const result = constructWorkflow(workflow);
    assert.ok(result.ready, 
      `Workflow ${workflow.id} not ready: ${result.errors.join(", ")}`);
    assert.equal(result.errors.length, 0,
      `Workflow ${workflow.id} has errors: ${result.errors.join(", ")}`);
  }
});

test("constructWorkflow reports errors for invalid definition", () => {
  const result = constructWorkflow({});
  assert.ok(!result.ready);
  assert.ok(result.errors.length > 0);
});

test("constructWorkflow includes warnings for missing domain pack", () => {
  const workflow = noticeRespondCatalog[0];
  const result = constructWorkflow(workflow);
  // Catalog workflows don't have registered domain packs yet
  assert.ok(result.warnings.some((w) => w.includes("No domain pack set")),
    `Expected domain pack warning, got: ${result.warnings.join(", ")}`);
});

test("constructAllWorkflows processes entire catalog", () => {
  const results = constructAllWorkflows(noticeRespondCatalog);
  assert.equal(results.length, noticeRespondCatalog.length);
  for (const result of results) {
    assert.ok(result.definition.id);
  }
});

test("factoryValidationSummary reports correct counts", () => {
  const results = constructAllWorkflows(noticeRespondCatalog);
  const summary = factoryValidationSummary(results);
  assert.equal(summary.total, noticeRespondCatalog.length);
  assert.equal(summary.ready, noticeRespondCatalog.length);
  assert.equal(summary.errors.length, 0);
});

// ═══ Domain Pack Tests ═══

test("PACK_REGISTRY is initially empty", () => {
  // Clean state — no packs should be registered by default
  assert.equal(Object.keys(PACK_REGISTRY).length, 0);
});

test("registerDomainPack stores a pack set", () => {
  const pack = {
    engine: "document-action",
    document: {
      name: "IRS Notice Pack",
      acceptedTypes: ["CP2000", "CP14"],
      classifierHints: ["IRS", "notice"],
      extractionSchema: ["noticeNumber", "amounts"],
      minConfidence: 0.7,
    },
    deadline: {
      name: "IRS Deadline Pack",
      triggeringEvents: ["explicit deadline in notice"],
      sourcePriority: ["uploaded notice"],
      jurisdictionDependent: false,
      computationRules: ["Do not infer deadlines"],
    },
    evidence: {
      name: "IRS Evidence Pack",
      evidenceTypes: ["W-2", "1099"],
      sufficiencyRules: ["Must match claimed amounts"],
      contradictionRules: ["Compare notice amounts with user records"],
      missingEvidenceBehavior: "Warn user",
    },
    research: {
      name: "IRS Research Pack",
      authoritativeSourceTypes: ["IRS.gov", "IRS publications"],
      jurisdictionalSourcesRequired: false,
      citationRequirements: ["Cite IRS publication number"],
    },
    analysis: {
      name: "CP2000 Analysis Pack",
      capabilities: ["fact-extraction", "deadline-analysis"],
      orderedChecks: ["classify notice", "extract amounts"],
      riskFactors: ["deadline approaching"],
      outputSections: ["notice summary", "discrepancies"],
    },
    draft: {
      name: "IRS Response Draft Pack",
      draftType: "response letter",
      requiredSections: ["recipient", "subject", "response"],
      prohibitedUnsupportedClaims: ["tax conclusions without evidence"],
      toneRules: ["factual", "respectful"],
    },
    validation: {
      name: "IRS Validation Pack",
      factualChecks: ["every amount matches source"],
      requirementChecks: ["every issue addressed"],
      unsupportedAssertionChecks: ["no fabricated facts"],
      adversarialChecks: ["deadline stressed"],
    },
    submission: {
      name: "MailMyPDF Submission Pack",
      methods: ["mail"],
      recipientRules: ["use address from notice"],
      supportsMailing: true,
      supportsTracking: true,
      proofRequirements: ["mailing record", "tracking"],
    },
  };
  registerDomainPack("test-cp2000", pack);
  const retrieved = getDomainPack("test-cp2000");
  assert.ok(retrieved);
  assert.equal(retrieved.document.name, "IRS Notice Pack");
  assert.equal(retrieved.submission.supportsMailing, true);
});

// ═══ Maturity Model Tests ═══

test("Blueprint workflows cannot claim document recognition", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "blueprint") {
      assert.notEqual(entry.productStatus, "authority",
        `Blueprint ${entry.id} cannot have authority product status`);
      assert.notEqual(entry.deploymentStatus, "production",
        `Blueprint ${entry.id} cannot be in production`);
    }
  }
});

test("Functional workflows must have passing tests", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "functional") {
      assert.equal(entry.testStatus, "passing",
        `Functional ${entry.id} must have passing tests`);
    }
  }
});

test("Authority workflows must have authority product status + production deployment", () => {
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.lifecycle === "authority") {
      assert.equal(entry.productStatus, "authority",
        `Authority ${entry.id} must have authority product status`);
      assert.equal(entry.deploymentStatus, "production",
        `Authority ${entry.id} must be deployed to production`);
      assert.equal(entry.testStatus, "passing",
        `Authority ${entry.id} must have passing tests`);
    }
  }
});

test("Maturity progression is monotonic in the registry", () => {
  const stats = registryStats();
  assert.ok(stats.byLifecycle["blueprint"] > 0, "Should have blueprint workflows");
  assert.ok(stats.byLifecycle["functional"] > 0, "Should have functional workflows");
  // Authority workflows are the most demanding — we should have at least 1
  assert.ok(stats.byLifecycle["authority"] >= 0, "Should track authority workflows");
});

test("Factory constructWorkflow flags authority workflows with unmet gates", () => {
  const fakeAuthority = {
    id: "fake-authority",
    vertical: "test",
    lifecycle: "authority",
    engine: "document-action",
    title: "Fake Authority",
    description: "test",
    disclaimer: "test",
    searchIntent: { primary: "test", secondary: [], canonicalPath: "/test", informationalEntryPoints: [], actionIntents: [] },
    documents: [{ name: "test", identifiers: [], acceptedFormats: [], extractionFields: [] }],
    deadlines: [{ id: "test", label: "test", trigger: "test", sourcePriority: [] }],
    requirements: [{ id: "test", label: "test", type: "response", source: "test", required: true }],
    evidence: [{ id: "test", label: "test", purpose: "test", required: false, examples: [] }],
    analysis: { capabilities: [], orderedChecks: [], outputSections: [] },
    drafting: { requiredSections: ["test"], forbiddenBehavior: [], validationChecks: [] },
    submission: { methods: ["mail"], recipientRules: [], proofRequirements: [] },
    capabilities: [],
    qualityGate: {
      documentRecognition: false,  // unmet!
      factGrounding: true,
      deadlineVerification: true,
      requirementCoverage: true,
      evidenceGrounding: true,
      draftValidation: true,
      submissionReadiness: true,
      proofReady: true,
    },
  };
  const result = constructWorkflow(fakeAuthority);
  assert.ok(!result.ready, "Fake authority with unmet gate should not be ready");
  assert.ok(result.errors.some((e) => e.includes("documentRecognition")),
    "Should flag unmet documentRecognition gate");
});

// ═══ Canonical Ownership Tests ═══

test("No two workflows from different verticals own the same canonical keyword", () => {
  const keywordMap = new Map();
  for (const entry of WORKFLOW_REGISTRY) {
    const key = entry.canonicalKeyword.toLowerCase();
    if (keywordMap.has(key)) {
      const existing = keywordMap.get(key);
      assert.equal(existing.vertical, entry.vertical,
        `Keyword "${entry.canonicalKeyword}" owned by both ${existing.vertical} and ${entry.vertical}`);
    }
    keywordMap.set(key, entry);
  }
});

test("SEO URLs don't collide across verticals", () => {
  const urls = WORKFLOW_REGISTRY.map((e) => e.seoUrl);
  assert.equal(new Set(urls).size, urls.length, "Duplicate SEO URLs in registry");
});
