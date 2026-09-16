import assert from "node:assert/strict";
import test from "node:test";
import {
  dateField,
  longTextField,
  personNameField,
  postalAddressField,
  referenceNumberField,
  selectField,
  validateWorkflowFields,
} from "../src/workflow-fields.js";
import { buildWorkflowManifest } from "../src/workflow-blueprints.js";
import { validateManifestShape } from "../src/workflow-manifest.js";

test("shared field factories create reusable intake primitives", () => {
  const fields = [
    personNameField({ id: "senderName", label: "Your name", required: true }),
    postalAddressField({ id: "senderAddress", label: "Your mailing address", required: true }),
    dateField({
      id: "noticeDate",
      label: "Notice date",
      origin: "extracted_confirmation",
    }),
    referenceNumberField({
      id: "referenceNumber",
      label: "Reference number",
      origin: "either",
      sensitive: true,
    }),
    longTextField({ id: "explanation", label: "What happened?", required: true }),
    selectField({
      id: "responseMode",
      label: "How do you want to respond?",
      required: true,
      options: [
        { value: "agree", label: "Agree" },
        { value: "disagree", label: "Disagree" },
      ],
    }),
  ];

  assert.deepEqual(validateWorkflowFields(fields), []);
  assert.equal(fields[2].origin, "extracted_confirmation");
  assert.equal(fields[3].sensitive, true);
});

test("select fields reject duplicate option values", () => {
  const errors = validateWorkflowFields([
    selectField({
      id: "mode",
      label: "Mode",
      options: [
        { value: "same", label: "One" },
        { value: "same", label: "Two" },
      ],
    }),
  ]);
  assert.ok(errors.some((error) => /duplicate option/.test(error)));
});

test("blueprint attaches workflow-specific fields to generated shared steps", () => {
  const manifest = buildWorkflowManifest({
    id: "cp2000-field-fixture",
    vertical: "notice-respond",
    title: "CP2000 Field Fixture",
    route: "/notice-respond/workflows/cp2000-field-fixture",
    archetype: "official-response",
    adapters: ["government", "tax"],
    stepFields: {
      intake: [
        personNameField({
          id: "senderName",
          label: "Your name",
          required: true,
        }),
      ],
      strategy: [
        selectField({
          id: "responseMode",
          label: "Response mode",
          required: true,
          options: [
            { value: "agree", label: "Agree" },
            { value: "disagree", label: "Disagree" },
          ],
        }),
      ],
    },
  });

  assert.equal(manifest.steps?.find((step) => step.id === "intake")?.fields?.[0]?.id, "senderName");
  assert.equal(manifest.steps?.find((step) => step.id === "strategy")?.fields?.[0]?.id, "responseMode");
  assert.deepEqual(validateManifestShape(manifest), []);
});

test("blueprint rejects fields assigned to a step it did not generate", () => {
  assert.throws(
    () => buildWorkflowManifest({
      id: "bad-fields",
      vertical: "notice-respond",
      title: "Bad Fields",
      route: "/notice-respond/workflows/bad-fields",
      archetype: "official-response",
      adapters: ["government"],
      stepFields: {
        imaginary: [
          personNameField({ id: "name", label: "Name" }),
        ],
      },
    }),
    /unknown generated step/,
  );
});
