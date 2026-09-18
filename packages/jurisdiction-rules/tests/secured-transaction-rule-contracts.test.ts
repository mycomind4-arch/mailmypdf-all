import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createJurisdictionRuleRegistry,
} from "../src/registry.js";

import {
  resolveUccGoverningLawRule,
} from "../src/ucc/governing-law/index.js";

import {
  resolveUccAttachmentRule,
} from "../src/ucc/attachment/index.js";

import {
  resolveUccExceptionRule,
} from "../src/ucc/exceptions/index.js";

const authority = {
  id: "synthetic-authority",
  title: "Synthetic authority",
  jurisdiction: "TEST-1",
};

describe("secured-transaction jurisdiction rule contracts", () => {
  test("resolves authority-backed governing-law data", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "governing-law-test",
        family: "ucc-governing-law",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          governingLawJurisdiction: "TEST-1",
          ruleDescription: "Synthetic governing-law rule",
          requiredFacts: ["debtor-location"],
        },
      },
    ]);

    const result = resolveUccGoverningLawRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.equal(
      result.value?.governingLawJurisdiction,
      "TEST-1",
    );
  });

  test("resolves authority-backed attachment conditions", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "attachment-test",
        family: "ucc-attachment",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          ruleDescription: "Synthetic attachment rule",
          requiredConditions: [
            "value",
            "debtor-rights",
            "authenticated-agreement",
          ],
        },
      },
    ]);

    const result = resolveUccAttachmentRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.deepEqual(
      result.value?.requiredConditions,
      [
        "value",
        "debtor-rights",
        "authenticated-agreement",
      ],
    );
  });

  test("resolves exception catalog without applying exceptions itself", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "exceptions-test",
        family: "ucc-exception",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          exceptions: [
            {
              id: "synthetic-priority-exception",
              target: "priority",
              description: "Synthetic priority exception",
            },
          ],
        },
      },
    ]);

    const result = resolveUccExceptionRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.equal(
      result.value?.exceptions[0]?.target,
      "priority",
    );
  });
});
