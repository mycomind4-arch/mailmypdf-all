import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecipientDirectory,
  resolveRecipientDestination,
} from "../src/recipient-resolution";

const directory = createRecipientDirectory([
  {
    id: "ssa-ca-postal",
    agency: "Social Security Administration",
    workflowIds: ["appeal-ssdi-denial"],
    jurisdiction: { country: "US", state: "CA" },
    methods: ["postal_mail"],
    postalAddress: {
      name: "Social Security Administration",
      line1: "123 Example St",
      city: "Example",
      state: "CA",
      postal: "95521",
    },
    source: {
      authority: "Social Security Administration",
      url: "https://example.gov/current-instructions",
      effectiveDate: "2026-01-01",
    },
    effectiveFrom: "2026-01-01",
  },
] as const);

test("recipient resolution requires an authority source", () => {
  assert.throws(() => createRecipientDirectory([
    {
      id: "bad",
      agency: "Agency",
      workflowIds: ["workflow"],
      jurisdiction: { country: "US" },
      methods: ["postal_mail"],
      postalAddress: { name: "Agency", line1: "1 Main", city: "X", state: "CA", postal: "90001" },
      source: { authority: "", url: "" },
    },
  ]), /authoritative source/);
});

test("recipient resolution matches workflow, jurisdiction, method, and effective date", () => {
  const result = resolveRecipientDestination(directory, {
    workflowId: "appeal-ssdi-denial",
    jurisdiction: { country: "US", state: "CA" },
    method: "postal_mail",
    onDate: "2026-09-17T00:00:00.000Z",
  });
  assert.equal(result.id, "ssa-ca-postal");
});

test("recipient resolution fails closed when no authoritative rule matches", () => {
  assert.throws(() => resolveRecipientDestination(directory, {
    workflowId: "appeal-ssdi-denial",
    jurisdiction: { country: "US", state: "OR" },
    method: "postal_mail",
    onDate: "2026-09-17T00:00:00.000Z",
  }), /No authoritative recipient destination/);
});
