import assert from "node:assert/strict";
import test from "node:test";
import {
  certifyWorkflowDomain,
  defineWorkflowDomainSpec,
  staleAuthoritySourceIds,
} from "../src/workflow-domain-spec.js";
import { buildWorkflowManifest } from "../src/workflow-blueprints.js";

function manifest() {
  return buildWorkflowManifest({
    id: "cp2000-domain-fixture",
    vertical: "notice-respond",
    title: "CP2000 Domain Fixture",
    route: "/notice-respond/workflows/cp2000-domain-fixture",
    archetype: "official-response",
    adapters: ["government", "tax"],
    commerce: "paid",
    documents: [{
      id: "cp2000",
      label: "IRS CP2000 notice",
      role: "primary",
      required: true,
      acceptedKinds: ["notice"],
      extractionSchema: "irs.cp2000.v1",
    }],
  });
}

function domain() {
  return defineWorkflowDomainSpec({
    workflowId: "cp2000-domain-fixture",
    version: 1,
    authorityMaxAgeDays: 365,
    extractionSchemaIds: ["irs.cp2000.v1"],
    authoritySources: [{
      id: "irs.cp2000",
      title: "Understanding Your CP2000 Notice",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/example",
      sourceType: "official_agency",
      reviewedAt: "2026-09-01",
    }],
    rules: [
      {
        id: "response-deadline",
        label: "Response deadline",
        kind: "deadline",
        description: "Use the deadline printed on the controlling notice.",
        severity: "blocking",
        authoritySourceIds: ["irs.cp2000"],
      },
      {
        id: "notice-response",
        label: "Notice response requirements",
        kind: "requirement",
        description: "Prepare the response around the controlling notice.",
        severity: "blocking",
        authoritySourceIds: ["irs.cp2000"],
      },
    ],
    evidenceRequirements: [{
      id: "supporting-records",
      label: "Supporting records",
      description: "Records supporting any disputed item.",
      required: false,
      acceptedDocumentKinds: ["evidence"],
      supportsRuleIds: ["notice-response"],
    }],
    aiTasks: [
      {
        id: "classify-notice",
        kind: "classify",
        promptVersion: "1",
        purpose: "Confirm the notice type.",
        instruction: "Classify only from the supplied document.",
        sourcePolicy: "document_only",
      },
      {
        id: "extract-notice",
        kind: "extract",
        promptVersion: "1",
        purpose: "Extract controlling notice facts.",
        instruction: "Extract only supported values with source evidence.",
        sourcePolicy: "document_only",
        outputSchemaId: "irs.cp2000.v1",
        requiresHumanConfirmation: true,
      },
      {
        id: "research-authority",
        kind: "research",
        promptVersion: "1",
        purpose: "Ground workflow rules in official authority.",
        instruction: "Use only the approved authority sources.",
        sourcePolicy: "authority_grounded",
      },
      {
        id: "draft-response",
        kind: "draft",
        promptVersion: "1",
        purpose: "Draft from verified matter facts.",
        instruction: "Do not add unsupported facts or claims.",
        sourcePolicy: "matter_record",
        requiresHumanConfirmation: true,
      },
      {
        id: "validate-response",
        kind: "validate",
        promptVersion: "1",
        purpose: "Validate the draft before approval.",
        instruction: "Flag unsupported claims and unresolved requirements.",
        sourcePolicy: "matter_record",
      },
    ],
    drafting: {
      purpose: "Prepare a factual response to the notice.",
      templateId: "official-response-letter.v1",
      tone: "professional and factual",
      requiresSourceBackedClaims: true,
      prohibitedClaims: [
        "Do not invent deadlines.",
        "Do not guarantee an outcome.",
      ],
      requiredSections: ["reference", "response", "requested-action"],
    },
  });
}

test("complete domain spec certifies against generated manifest", () => {
  const result = certifyWorkflowDomain(
    manifest(),
    domain(),
    "2026-09-16T00:00:00Z",
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.ready, true);
});

test("domain certification catches a dangling extraction schema", () => {
  const broken = manifest();
  broken.documents = [{
    ...broken.documents![0]!,
    extractionSchema: "missing.schema.v1",
  }];
  const result = certifyWorkflowDomain(
    broken,
    domain(),
    "2026-09-16T00:00:00Z",
  );
  assert.ok(result.issues.some((issue) => issue.code === "missing_extraction_schema"));
});

test("gold workflows fail certification when authority is stale", () => {
  const gold = { ...manifest(), maturity: "gold" as const };
  const result = certifyWorkflowDomain(
    gold,
    domain(),
    "2028-09-16T00:00:00Z",
  );
  assert.ok(result.issues.some((issue) => issue.code === "stale_authority"));
  assert.equal(result.ready, false);
});

test("freshness calculation is deterministic", () => {
  assert.deepEqual(
    staleAuthoritySourceIds(domain(), "2026-09-16T00:00:00Z"),
    [],
  );
});
