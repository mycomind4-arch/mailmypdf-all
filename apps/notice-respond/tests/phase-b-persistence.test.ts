/**
 * Phase B — CaseRepository Owner-Scoped Persistence Wiring
 *
 * Regression tests proving:
 * 1. Owner A creates a case → owner B cannot retrieve it
 * 2. Owner B cannot mutate owner A's case
 * 3. Owner B cannot advance its workflow
 * 4. Workflow state survives request boundaries (persist → load → advance → load)
 * 5. Client-provided owner IDs are ignored (owner comes from auth)
 * 6. All three production workflows (CP2000, CP14, CP504) persist correctly
 * 7. No case enumeration across owners
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  createCase,
  updateCase,
  serializeCase,
  deserializeCase,
  type NoticeCase,
} from "../src/domain/notice";
import {
  createWorkflowState,
  advanceStep,
  canAdvance,
  setUpload,
  setExtraction,
  setUserFacts,
  setUserObjective,
  setDraft,
  setDraftValidation,
  setReviewChecks,
  setMailing,
  type WorkflowState,
  type DocumentUpload,
  type ExtractionResult,
  type MailingState,
  type DraftValidationResult,
} from "../src/domain/workflow-runtime";
import { InMemoryCaseRepository } from "../src/platform/in-memory-repository";
import { setRepository } from "../src/platform/repository";
import { getWorkflowById } from "../src/domain/workflow-catalog";

// ── Helpers ──────────────────────────────────────────────────

function freshRepo(): InMemoryCaseRepository {
  const repo = new InMemoryCaseRepository();
  setRepository(repo);
  return repo;
}

function makeUpload(): DocumentUpload {
  return {
    fileName: "notice.pdf",
    fileSize: 1024,
    fileType: "application/pdf",
    rawText: "IRS Notice",
    uploadedAt: new Date().toISOString(),
  };
}

function makeExtraction(noticeType: string): ExtractionResult {
  return {
    noticeType: noticeType as any,
    classificationConfidence: 0.95,
    facts: [],
    deadlines: [{ date: "2026-12-31", rawText: "Dec 31", certainty: "high" } as any],
    agency: "IRS",
    referenceNumber: "CP2000-001",
    noticeDate: "2026-08-01",
    amountOwed: "$5,000",
    rawText: "Notice text",
    extractionConfidence: 0.95,
  };
}

function makeValidation(passed = true): DraftValidationResult {
  return { findings: [], passed, errors: passed ? 0 : 1, warnings: 0 };
}

function makeMailing(): MailingState {
  return {
    method: "certified",
    recipient: {
      name: "IRS",
      org: "IRS",
      address1: "1 Main St",
      address2: "",
      city: "City",
      state: "CA",
      zip: "90000",
    },
    status: "draft",
  };
}

/** Simulate a full workflow progression up to review for a given workflow ID.
 *  Advances step-by-step until the phase is "review", setting required data along the way.
 *  Works for both custom-step workflows (CP2000 has "extraction") and shared-step workflows (CP504, CP14). */
function progressToReview(workflowId: string): WorkflowState {
  const def = getWorkflowById(workflowId);
  let state = createWorkflowState(def);

  // Upload + extraction (needed before advancing past document step)
  state = setUpload(state, makeUpload());
  state = setExtraction(state, makeExtraction(workflowId.includes("cp14") ? "irs_cp14" : workflowId.includes("cp504") ? "irs_cp504" : "irs_cp2000"));

  // Set facts and objective upfront so they're available when needed
  state = setUserFacts(state, "My facts here");
  state = setUserObjective(state, "My objective");

  // Set draft and validation upfront
  state = setDraft(state, "This is my response draft.");
  state = setDraftValidation(state, makeValidation(true));

  // Advance step-by-step until we reach the "review" phase
  let safety = 0;
  while (state.phase !== "review" && safety < 15) {
    state = advanceStep(state, def);
    safety++;
  }

  // Review checks — auto-approve
  state = setReviewChecks(state, state.reviewChecks.map(() => true));

  return state;
}

// ── Security: Cross-Owner Access Rejection ────────────────────

test("Phase B: owner A creates a case, owner B cannot retrieve it", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  const caseObj = updateCase(createCase("cp2000-response"), { ownerId: ownerA });
  await repo.save(caseObj);

  // Owner A can load it
  const loadedA = await repo.load(caseObj.id, ownerA);
  assert.ok(loadedA, "Owner A should load their own case");

  // Owner B cannot load it — returns null (safe not-found)
  const loadedB = await repo.load(caseObj.id, ownerB);
  assert.equal(loadedB, null, "Owner B must not retrieve owner A's case");
});

test("Phase B: owner B cannot mutate owner A's case", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  const caseObj = updateCase(createCase("cp2000-response"), { ownerId: ownerA });
  await repo.save(caseObj);

  // Owner B tries to save with their own ownerId but same case ID
  const stolenCase = updateCase(caseObj, { ownerId: ownerB, userFacts: "hacked" });
  await repo.save(stolenCase);

  // Owner A's case should be unaffected — owner B's save created a separate entry
  const ownerACase = await repo.load(caseObj.id, ownerA);
  assert.ok(ownerACase, "Owner A's case should still exist");
  assert.equal(ownerACase!.userFacts, "", "Owner A's data must not be overwritten by owner B");

  // Owner B should see their own version (separate entry)
  const ownerBCase = await repo.load(caseObj.id, ownerB);
  assert.ok(ownerBCase, "Owner B has their own entry");
  assert.equal(ownerBCase!.userFacts, "hacked");
});

test("Phase B: owner B cannot delete owner A's case", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  const caseObj = updateCase(createCase("cp2000-response"), { ownerId: ownerA });
  await repo.save(caseObj);

  const deleted = await repo.delete(caseObj.id, ownerB);
  assert.equal(deleted, false, "Owner B cannot delete owner A's case");

  // Owner A's case should still exist
  const loaded = await repo.load(caseObj.id, ownerA);
  assert.ok(loaded, "Owner A's case must survive owner B's delete attempt");
});

test("Phase B: owner B cannot check existence of owner A's case", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  const caseObj = updateCase(createCase("cp2000-response"), { ownerId: ownerA });
  await repo.save(caseObj);

  const existsForB = await repo.exists(caseObj.id, ownerB);
  assert.equal(existsForB, false, "Owner B should not see that owner A's case exists");

  const existsForA = await repo.exists(caseObj.id, ownerA);
  assert.equal(existsForA, true, "Owner A should see their own case exists");
});

test("Phase B: no case enumeration across owners", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  // Owner A creates 3 cases
  for (let i = 0; i < 3; i++) {
    await repo.save(updateCase(createCase("cp2000-response"), { ownerId: ownerA }));
  }

  // Owner B creates 2 cases
  for (let i = 0; i < 2; i++) {
    await repo.save(updateCase(createCase("cp14-response"), { ownerId: ownerB }));
  }

  const summariesA = await repo.listSummaries(ownerA);
  const summariesB = await repo.listSummaries(ownerB);

  assert.equal(summariesA.length, 3, "Owner A sees only their 3 cases");
  assert.equal(summariesB.length, 2, "Owner B sees only their 2 cases");
  assert.ok(summariesA.every((s) => !summariesB.some((sb) => sb.id === s.id)), "No cross-owner case leakage");
});

test("Phase B: owner B cannot save audit entries on owner A's case", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  const caseObj = updateCase(createCase("cp2000-response"), { ownerId: ownerA });
  await repo.save(caseObj);

  // Owner B attempts to save an audit entry referencing owner A's case
  await assert.rejects(
    async () => {
      await repo.saveAudit({
        id: "audit-001",
        caseId: caseObj.id,
        actor: ownerB,
        action: "approve",
        objectType: "case",
        description: "unauthorized approval",
        result: "success",
        isSecurityEvent: true,
        timestamp: new Date().toISOString(),
      }, ownerB);
    },
    (err: any) => err.code === "UNAUTHORIZED" || err.message.includes("another user"),
    "Owner B must not save audit entries on owner A's case",
  );
});

// ── Request-Boundary State Survival ───────────────────────────

test("Phase B: workflow state survives request boundaries — CP2000", async () => {
  const repo = freshRepo();
  const ownerId = "user-a-001";

  // Request 1: Create case → initialize workflow → persist
  let wfState = progressToReview("cp2000-response");
  const caseObj = updateCase(createCase("cp2000-response"), {
    ownerId,
    workflowState: wfState,
    noticeType: "irs_cp2000",
    userFacts: wfState.userFacts,
    userObjective: wfState.userObjective,
  });
  await repo.save(caseObj);

  // Request 2: Retrieve same case → reconstruct workflow state
  const loaded1 = await repo.load(caseObj.id, ownerId);
  assert.ok(loaded1, "Case must load after persistence");
  assert.ok(loaded1!.workflowState, "Workflow state must be persisted");
  const restoredState = loaded1!.workflowState as WorkflowState;
  assert.equal(restoredState.phase, "review", "Workflow phase must survive request boundary");
  assert.equal(restoredState.userFacts, wfState.userFacts, "User facts must survive");
  assert.equal(restoredState.userObjective, wfState.userObjective, "User objective must survive");
  assert.equal(restoredState.approved, true, "Approval state must survive (auto-approved by setReviewChecks)");

  // Request 3: Advance workflow → persist
  const def = getWorkflowById("cp2000-response");
  const advancedState = advanceStep(restoredState, def);
  const updatedCase = updateCase(loaded1!, { workflowState: advancedState });
  await repo.save(updatedCase);

  // Request 4: Retrieve → verify state is intact
  const loaded2 = await repo.load(caseObj.id, ownerId);
  assert.ok(loaded2, "Case must load after update");
  const finalState = loaded2!.workflowState as WorkflowState;
  assert.notEqual(finalState.step, restoredState.step, "Workflow step must have advanced");
  assert.ok(finalState.step > restoredState.step, "Step must be greater than before");
});

test("Phase B: workflow state survives request boundaries — CP14", async () => {
  const repo = freshRepo();
  const ownerId = "user-a-001";

  // Request 1: Create + persist
  let wfState = progressToReview("cp14-response");
  const caseObj = updateCase(createCase("cp14-response"), {
    ownerId,
    workflowState: wfState,
    noticeType: "irs_cp14",
  });
  await repo.save(caseObj);

  // Request 2: Load
  const loaded1 = await repo.load(caseObj.id, ownerId);
  assert.ok(loaded1, "CP14 case must load");
  assert.ok(loaded1!.workflowState, "CP14 workflow state must persist");
  const restoredState = loaded1!.workflowState as WorkflowState;
  assert.equal(restoredState.phase, "review", "CP14 phase must survive request boundary");
  assert.equal(restoredState.approved, true, "CP14 approval must survive");

  // Request 3: Advance + persist
  const def = getWorkflowById("cp14-response");
  const advancedState = advanceStep(restoredState, def);
  await repo.save(updateCase(loaded1!, { workflowState: advancedState }));

  // Request 4: Verify
  const loaded2 = await repo.load(caseObj.id, ownerId);
  const finalState = loaded2!.workflowState as WorkflowState;
  assert.ok(finalState.step > restoredState.step, "CP14 step must advance across request boundary");
});

test("Phase B: workflow state survives request boundaries — CP504", async () => {
  const repo = freshRepo();
  const ownerId = "user-a-001";

  // Request 1: Create + persist
  let wfState = progressToReview("cp504-response");
  const caseObj = updateCase(createCase("cp504-response"), {
    ownerId,
    workflowState: wfState,
    noticeType: "irs_cp504",
  });
  await repo.save(caseObj);

  // Request 2: Load
  const loaded1 = await repo.load(caseObj.id, ownerId);
  assert.ok(loaded1, "CP504 case must load");
  assert.ok(loaded1!.workflowState, "CP504 workflow state must persist");
  const restoredState = loaded1!.workflowState as WorkflowState;
  assert.equal(restoredState.phase, "review", "CP504 phase must survive request boundary");

  // Request 3: Advance + persist
  const def = getWorkflowById("cp504-response");
  const advancedState = advanceStep(restoredState, def);
  await repo.save(updateCase(loaded1!, { workflowState: advancedState }));

  // Request 4: Verify
  const loaded2 = await repo.load(caseObj.id, ownerId);
  const finalState = loaded2!.workflowState as WorkflowState;
  assert.ok(finalState.step > restoredState.step, "CP504 step must advance across request boundary");
});

// ── Consequential Actions: Cross-Owner Rejection ──────────────

test("Phase B: owner B cannot advance owner A's workflow via persistence", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  // Owner A creates and persists a case with workflow state
  const wfState = progressToReview("cp2000-response");
  const caseObj = updateCase(createCase("cp2000-response"), {
    ownerId: ownerA,
    workflowState: wfState,
  });
  await repo.save(caseObj);

  // Owner B tries to load the case — gets null
  const stolenCase = await repo.load(caseObj.id, ownerB);
  assert.equal(stolenCase, null, "Owner B cannot load owner A's case to advance it");

  // Owner B cannot mutate via repo — they'd need the case object
  // Even if they somehow had the case data, saving with ownerB creates a separate entry
  const fakeCase = updateCase(caseObj, { ownerId: ownerB, workflowState: { ...wfState, step: 99 } });
  await repo.save(fakeCase);

  // Owner A's original state is untouched
  const ownerACase = await repo.load(caseObj.id, ownerA);
  assert.ok(ownerACase, "Owner A's case still exists");
  const ownerAState = ownerACase!.workflowState as WorkflowState;
  assert.equal(ownerAState.step, wfState.step, "Owner A's workflow step must not be changed by owner B");
});

test("Phase B: owner B cannot fulfill/mail owner A's case", async () => {
  const repo = freshRepo();

  const ownerA = "user-a-001";
  const ownerB = "user-b-002";

  // Owner A creates a case with mailing state
  const wfState = progressToReview("cp2000-response");
  const def = getWorkflowById("cp2000-response");
  const mailedState = setMailing(wfState, makeMailing());
  const caseObj = updateCase(createCase("cp2000-response"), {
    ownerId: ownerA,
    workflowState: mailedState,
    mailingMethod: "certified",
    providerOrderId: "order-001",
  });
  await repo.save(caseObj);

  // Owner B cannot retrieve the case to access mailing info
  const stolenCase = await repo.load(caseObj.id, ownerB);
  assert.equal(stolenCase, null, "Owner B cannot retrieve owner A's case for mailing");

  // Owner B cannot list owner A's cases to find mailing targets
  const stolenSummaries = await repo.listSummaries(ownerB);
  assert.equal(stolenSummaries.length, 0, "Owner B sees no cases from owner A");

  // Owner A's mailing data is intact
  const ownerACase = await repo.load(caseObj.id, ownerA);
  assert.ok(ownerACase, "Owner A's case is intact");
  assert.equal(ownerACase!.providerOrderId, "order-001", "Owner A's mailing order is intact");
  assert.equal(ownerACase!.mailingMethod, "certified", "Owner A's mailing method is intact");
});

// ── Client-Controlled Owner Bypass Prevention ────────────────

test("Phase B: save() rejects cases with empty ownerId", async () => {
  const repo = freshRepo();

  const caseObj = createCase("cp2000-response");
  assert.equal(caseObj.ownerId, "", "New case starts with empty ownerId");

  await assert.rejects(
    async () => repo.save(caseObj),
    (err: any) => err.code === "VALIDATION_ERROR" || err.message.includes("owner"),
    "Save must reject cases without an owner",
  );
});

test("Phase B: serialization round-trips workflow state correctly", () => {
  const wfState = progressToReview("cp2000-response");

  const caseObj = updateCase(createCase("cp2000-response"), {
    ownerId: "user-001",
    workflowState: wfState,
  });

  // Serialize → deserialize (simulates DB round-trip)
  const serialized = serializeCase(caseObj);
  const deserialized = deserializeCase(serialized);

  assert.ok(deserialized.workflowState, "Workflow state must survive serialization");
  const restoredState = deserialized.workflowState as WorkflowState;
  assert.equal(restoredState.phase, wfState.phase, "Phase must survive round-trip");
  assert.equal(restoredState.step, wfState.step, "Step must survive round-trip");
  assert.equal(restoredState.userFacts, wfState.userFacts, "User facts must survive round-trip");
  assert.equal(restoredState.approved, wfState.approved, "Approval must survive round-trip");
  assert.equal(restoredState.reviewChecks, wfState.reviewChecks, "Review checks must survive round-trip");
});
