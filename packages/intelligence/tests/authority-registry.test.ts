import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthorityRegistry,
  createPurposeAuthorityRegistry,
  requireSingleAuthorityRule,
  requireSinglePurposeAuthorityRule,
  resolveAuthorityRules,
  resolvePurposeAuthorityRules,
} from "../src/authority";

const registry = createAuthorityRegistry([
  {
    id: "ssdi-required-form-2026",
    type: "required_form",
    workflowIds: ["appeal-ssdi-denial"],
    jurisdiction: { country: "US" },
    source: {
      id: "ssa-reconsideration-instructions-2026",
      title: "SSA reconsideration instructions",
      issuer: "Social Security Administration",
      url: "https://example.gov/ssa/reconsideration",
      revision: "2026",
      retrievedAt: "2026-09-17T00:00:00.000Z",
      effectiveFrom: "2026-01-01",
    },
    value: { form: "SSA-561-U2" },
  },
] as const);

test("authority registry requires traceable source metadata", () => {
  assert.throws(() => createAuthorityRegistry([
    {
      id: "bad",
      type: "deadline",
      workflowIds: ["workflow"],
      jurisdiction: { country: "US" },
      source: { id: "source", title: "", issuer: "Agency", url: "", retrievedAt: "" },
      value: { days: 30 },
    },
  ]), /complete source metadata/);
});

test("authority rules resolve by workflow, type, jurisdiction, and effective date", () => {
  const matches = resolveAuthorityRules(registry, {
    workflowId: "appeal-ssdi-denial",
    type: "required_form",
    jurisdiction: { country: "US", state: "CA" },
    onDate: "2026-09-17T00:00:00.000Z",
  });
  assert.equal(matches.length, 1);
  assert.equal((matches[0]?.value as { form: string }).form, "SSA-561-U2");
});

test("single-rule lookup fails closed when no current rule matches", () => {
  assert.throws(() => requireSingleAuthorityRule(registry, {
    workflowId: "different-workflow",
    type: "required_form",
    jurisdiction: { country: "US" },
    onDate: "2026-09-17T00:00:00.000Z",
  }), /No current authority rule/);
});


const purposeRegistry = createPurposeAuthorityRegistry([
  {
    id: "registered-org-name-us-2026",
    type: "identity",
    purposes: ["registered-organization-name"],
    jurisdiction: { country: "US" },
    source: {
      id: "uniform-registration-guidance",
      title: "Registration naming guidance",
      issuer: "Example Authority",
      url: "https://example.gov/registration/name",
      retrievedAt: "2026-09-17T00:00:00.000Z",
      effectiveFrom: "2026-01-01",
    },
    value: { preferredSource: "public-organic-record" },
  },
] as const);

test("purpose authority rules resolve independently of workflow ids", () => {
  const matches = resolvePurposeAuthorityRules(purposeRegistry, {
    purpose: "registered-organization-name",
    type: "identity",
    jurisdiction: { country: "US", state: "CA" },
    onDate: "2026-09-17T00:00:00.000Z",
  });
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0]?.value, { preferredSource: "public-organic-record" });
});

test("single purpose-rule lookup fails closed on ambiguity", () => {
  const ambiguous = createPurposeAuthorityRegistry([
    ...purposeRegistry,
    {
      id: "registered-org-name-us-2026-alt",
      type: "identity",
      purposes: ["registered-organization-name"],
      jurisdiction: { country: "US" },
      source: {
        id: "uniform-registration-guidance-alt",
        title: "Alternate naming guidance",
        issuer: "Example Authority",
        url: "https://example.gov/registration/name-alt",
        retrievedAt: "2026-09-17T00:00:00.000Z",
      },
      value: { preferredSource: "official-registry-record" },
    },
  ] as const);

  assert.throws(() => requireSinglePurposeAuthorityRule(ambiguous, {
    purpose: "registered-organization-name",
    type: "identity",
    jurisdiction: { country: "US" },
    onDate: "2026-09-17T00:00:00.000Z",
  }), /ambiguous/);
});

test("purpose authority registry rejects empty purposes", () => {
  assert.throws(() => createPurposeAuthorityRegistry([
    {
      id: "bad-purpose",
      type: "jurisdiction",
      purposes: [],
      jurisdiction: { country: "US" },
      source: {
        id: "source",
        title: "Source",
        issuer: "Agency",
        url: "https://example.gov/source",
        retrievedAt: "2026-09-17T00:00:00.000Z",
      },
      value: {},
    },
  ]), /at least one non-empty purpose/);
});
