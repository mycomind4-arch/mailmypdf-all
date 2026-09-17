import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExhibitIndex,
  createCorrespondencePacketPlan,
  renderExhibitIndex,
} from "../src/exhibit-index.js";

test("buildExhibitIndex numbers included evidence deterministically", () => {
  const index = buildExhibitIndex([
    { evidenceId: "ev-1", label: "Medical records", pageRef: "1-3" },
    { evidenceId: "ev-2", label: "Internal note", include: false },
    { evidenceId: "ev-3", label: "Submission receipt" },
  ]);

  assert.deepEqual(index.map((entry) => entry.number), ["Exhibit A", "Exhibit B"]);
  assert.deepEqual(index.map((entry) => entry.evidenceId), ["ev-1", "ev-3"]);
  assert.match(renderExhibitIndex(index), /Exhibit A: Medical records/);
});

test("packet plan preserves attachment order and rejects duplicates", () => {
  const base = {
    matterId: "matter-1",
    workflowId: "appeal-insurance-denial",
    letterDocumentId: "letter-1",
    recipient: { name: "Appeals", line1: "1 Main St", city: "Example", state: "CA", postal: "95501" },
    mailingClass: "certified" as const,
    exhibits: [{ evidenceId: "ev-1", label: "Receipt" }],
  };
  const plan = createCorrespondencePacketPlan({
    ...base,
    attachments: [
      { documentId: "doc-1", evidenceId: "ev-1", label: "Receipt" },
      { documentId: "doc-2", label: "Clinical records" },
    ],
  });
  assert.deepEqual(plan.attachments.map((attachment) => attachment.position), [0, 1]);

  assert.throws(() => createCorrespondencePacketPlan({
    ...base,
    attachments: [
      { documentId: "doc-1", label: "A" },
      { documentId: "doc-1", label: "B" },
    ],
  }), /Duplicate packet attachment/);
});
