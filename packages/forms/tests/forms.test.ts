import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRequiredOfficialForms,
  createOfficialFormRegistry,
  hasRequiredOfficialForms,
  missingRequiredOfficialForms,
  resolveRequiredOfficialForms,
} from "../src/index";

const registry = createOfficialFormRegistry([
  {
    kind: "form_a",
    agency: "Example Agency",
    formNumber: "A-1",
    title: "Primary Form",
    sourceFilename: "a-1.pdf",
    mailReadyFilename: "a-1.normalized.pdf",
    source: {
      authority: "Example Agency",
      revision: "2026-01",
    },
    signatures: ["claimant"],
  },
  {
    kind: "form_b",
    agency: "Example Agency",
    formNumber: "B-2",
    title: "Supplement",
    sourceFilename: "b-2.pdf",
  },
] as const);

test("official form registry rejects duplicate kinds", () => {
  assert.throws(
    () =>
      createOfficialFormRegistry([
        { kind: "dup", agency: "A", formNumber: "1", title: "One", sourceFilename: "1.pdf" },
        { kind: "dup", agency: "A", formNumber: "2", title: "Two", sourceFilename: "2.pdf" },
      ]),
    /Duplicate official form kind/,
  );
});

test("requirement rules resolve a deterministic form set", () => {
  const medical = resolveRequiredOfficialForms(
    registry,
    [
      { id: "base", when: () => true, require: ["form_a"] as const },
      { id: "medical", when: (context: { medical: boolean }) => context.medical, require: ["form_b"] as const },
    ],
    { medical: true },
  );
  assert.deepEqual(medical.map((form) => form.kind), ["form_a", "form_b"]);
});

test("form readiness fails closed unless every required form is clean and included", () => {
  const required = [...registry];
  const documents = [
    { evidence_kind: "form_a", included: true, usable: true, security_status: "clean" },
    { evidence_kind: "form_b", included: false, usable: true, security_status: "clean" },
  ];

  assert.equal(hasRequiredOfficialForms(documents, required), false);
  assert.deepEqual(missingRequiredOfficialForms(documents, required).map((form) => form.kind), ["form_b"]);
  assert.throws(() => assertRequiredOfficialForms(documents, required), /B-2/);
});

test("form readiness succeeds only for clean included usable documents", () => {
  const documents = registry.map((form) => ({
    evidence_kind: form.kind,
    included: true,
    usable: true,
    security_status: "clean",
  }));
  assert.equal(hasRequiredOfficialForms(documents, registry), true);
  assert.doesNotThrow(() => assertRequiredOfficialForms(documents, registry));
});
