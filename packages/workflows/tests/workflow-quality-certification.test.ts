import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowManifest } from "../src/workflow-blueprints.js";
import { certifyWorkflowQuality } from "../src/workflow-quality-certification.js";
import { defineWorkflowDomainSpec } from "../src/workflow-domain-spec.js";

function fixture() {
  const manifest = buildWorkflowManifest({
    id: "quality-fixture",
    vertical: "notice-respond",
    title: "Quality Fixture",
    route: "/notice-respond/workflows/quality-fixture",
    archetype: "official-response",
    adapters: ["government"],
    commerce: "paid",
  });

  const domain = defineWorkflowDomainSpec({
    workflowId: "quality-fixture",
    version: 1,
    authorityMaxAgeDays: 365,
    extractionSchemaIds: [],
    authoritySources: [{
      id: "agency-source",
      title: "Official workflow guidance",
      publisher: "Agency",
      url: "https://example.gov/workflow",
      sourceType: "official_agency",
      reviewedAt: "2026-09-01",
    }],
    rules: [
      {
        id: "deadline-rule",
        label: "Deadline",
        kind: "deadline",
        description: "Use the controlling source deadline.",
        severity: "blocking",
        authoritySourceIds: ["agency-source"],
      },
      {
        id: "requirement-rule",
        label: "Requirement",
        kind: "requirement",
        description: "Follow the controlling instructions.",
        severity: "blocking",
        authoritySourceIds: ["agency-source"],
      },
    ],
    evidenceRequirements: [{
      id: "source-record",
      label: "Source record",
      description: "Record supporting the response.",
      required: false,
      supportsRuleIds: ["requirement-rule"],
    }],
    aiTasks: [
      {
        id: "classify",
        kind: "classify",
        promptVersion: "1",
        purpose: "Classify",
        instruction: "Classify the source.",
        sourcePolicy: "document_only",
      },
      {
        id: "extract",
        kind: "extract",
        promptVersion: "1",
        purpose: "Extract",
        instruction: "Extract source facts.",
        sourcePolicy: "document_only",
      },
      {
        id: "research",
        kind: "research",
        promptVersion: "1",
        purpose: "Research",
        instruction: "Use approved authority.",
        sourcePolicy: "authority_grounded",
      },
      {
        id: "draft",
        kind: "draft",
        promptVersion: "1",
        purpose: "Draft",
        instruction: "Draft from verified facts.",
        sourcePolicy: "matter_record",
      },
      {
        id: "validate",
        kind: "validate",
        promptVersion: "1",
        purpose: "Validate",
        instruction: "Validate the draft.",
        sourcePolicy: "matter_record",
      },
    ],
    drafting: {
      purpose: "Prepare correspondence.",
      templateId: "letter.v1",
      tone: "professional",
      requiresSourceBackedClaims: true,
      prohibitedClaims: ["Do not invent facts."],
    },
  });

  return { manifest, domain };
}

test("static definition can be ready without being production ready", () => {
  const { manifest, domain } = fixture();
  const result = certifyWorkflowQuality({
    manifest,
    domain,
    now: "2026-09-16T00:00:00Z",
  });

  assert.equal(result.definitionReady, true);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.acceptanceReady, false);
  assert.equal(result.productionReady, false);
});

test("production readiness requires runtime handlers and all required acceptance evidence", () => {
  const { manifest, domain } = fixture();
  manifest.maturity = "production-verified";

  const requiredRuntime = [
    ...new Set(manifest.steps!.flatMap((step) => step.uses)),
  ];
  const acceptance = manifest.acceptanceScenarios!
    .filter((scenario) => scenario.required)
    .map((scenario) => ({
      scenarioId: scenario.id,
      status: "passed" as const,
      runId: `run-${scenario.id}`,
    }));

  const result = certifyWorkflowQuality({
    manifest,
    domain,
    runtimeCapabilities: requiredRuntime,
    acceptance,
    now: "2026-09-16T00:00:00Z",
  });

  assert.equal(result.definitionReady, true);
  assert.equal(result.runtimeReady, true);
  assert.equal(result.acceptanceReady, true);
  assert.equal(result.productionReady, true);
});

test("one failed acceptance scenario blocks production", () => {
  const { manifest, domain } = fixture();
  manifest.maturity = "production-verified";

  const requiredRuntime = [
    ...new Set(manifest.steps!.flatMap((step) => step.uses)),
  ];
  const acceptance = manifest.acceptanceScenarios!
    .filter((scenario) => scenario.required)
    .map((scenario, index) => ({
      scenarioId: scenario.id,
      status: index === 0 ? "failed" as const : "passed" as const,
    }));

  const result = certifyWorkflowQuality({
    manifest,
    domain,
    runtimeCapabilities: requiredRuntime,
    acceptance,
    now: "2026-09-16T00:00:00Z",
  });

  assert.equal(result.productionReady, false);
  assert.ok(result.failedAcceptanceScenarios.length === 1);
});
