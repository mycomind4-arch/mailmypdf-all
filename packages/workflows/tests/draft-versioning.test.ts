import assert from "node:assert/strict";
import test from "node:test";
import {
  addDraftVersion,
  approveCurrentDraftVersion,
  createVersionedDraft,
  getCurrentDraftVersion,
  hasDraftContentChanged,
  isDraftApprovalValid,
  setCurrentDraftValidation,
} from "../src/draft-versioning.js";

test("draft approval binds to the exact current version hash", async () => {
  let draft = createVersionedDraft();
  draft = await addDraftVersion(draft, "First complete draft.", "template", {
    id: "draft-v1",
    createdAt: "2026-09-18T00:00:00Z",
  });
  draft = approveCurrentDraftVersion(draft, "user-1", {
    approvedAt: "2026-09-18T00:05:00Z",
  });

  assert.equal(isDraftApprovalValid(draft), true);
  assert.equal(draft.approval.approvedVersionId, "draft-v1");
  assert.match(draft.approval.approvedDraftSha256 ?? "", /^[a-f0-9]{64}$/);
});

test("editing an approved draft makes the approval stale", async () => {
  let draft = createVersionedDraft();
  draft = await addDraftVersion(draft, "Approved content.", "template", {
    id: "draft-v1",
  });
  draft = approveCurrentDraftVersion(draft, "user-1");
  draft = await addDraftVersion(draft, "Approved content with an edit.", "user_edited", {
    id: "draft-v2",
  });

  assert.equal(draft.approval.isStale, true);
  assert.equal(isDraftApprovalValid(draft), false);
  assert.match(draft.approval.staleReason ?? "", /Re-approval required/);
});

test("draft versions retain validation and unresolved placeholders", async () => {
  let draft = createVersionedDraft();
  draft = await addDraftVersion(
    draft,
    "Dear [RECIPIENT], please review [REFERENCE_NUMBER].",
    "ai_assisted",
    { id: "draft-v1" },
  );
  draft = setCurrentDraftValidation(draft, false);

  const current = getCurrentDraftVersion(draft);
  assert.deepEqual(current?.unresolvedPlaceholders, [
    "[RECIPIENT]",
    "[REFERENCE_NUMBER]",
  ]);
  assert.equal(current?.validationPassed, false);
});

test("content-change check is hash based", async () => {
  let draft = createVersionedDraft();
  draft = await addDraftVersion(draft, "Same content", "template", {
    id: "draft-v1",
  });

  assert.equal(await hasDraftContentChanged(draft, "Same content"), false);
  assert.equal(await hasDraftContentChanged(draft, "Different content"), true);
});
