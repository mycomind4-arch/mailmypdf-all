import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createCase, updateCase, transitionStatus } from "../src/domain/notice.ts";
import { InMemoryCaseRepository } from "../src/platform/in-memory-repository.ts";
import { createAuditEntry } from "../src/domain/audit.ts";
import { RepositoryError, RepositoryErrorCode } from "../src/domain/case-repository.ts";

const OWNER_A = "user-aaa-0000-0000-000000000001";
const OWNER_B = "user-bbb-0000-0000-000000000002";

function makeCase(ownerId, workflowId = "analyze") {
  return updateCase(createCase(workflowId), { ownerId });
}

describe("Case Repository (In-Memory) — Ownership-Aware", () => {
  it("saves and loads a case for the owning user", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = makeCase(OWNER_A);
    repo.saveSync(myCase);
    const loaded = repo.loadSync(myCase.id, OWNER_A);

    assert.ok(loaded !== null);
    assert.equal(loaded.id, myCase.id);
    assert.equal(loaded.status, "intake");
  });

  it("returns null when loading another user's case", () => {
    const repo = new InMemoryCaseRepository();
    const caseA = makeCase(OWNER_A);
    repo.saveSync(caseA);

    const loaded = repo.loadSync(caseA.id, OWNER_B);
    assert.equal(loaded, null, "Cross-user load must return null, not the case");
  });

  it("returns null for missing case", () => {
    const repo = new InMemoryCaseRepository();
    const loaded = repo.loadSync("nonexistent", OWNER_A);
    assert.equal(loaded, null);
  });

  it("throws when saving a case without an owner", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = createCase("analyze"); // ownerId defaults to ""

    assert.throws(
      () => repo.saveSync(myCase),
      (err) => err instanceof RepositoryError && err.code === RepositoryErrorCode.VALIDATION_ERROR,
    );
  });

  it("updates an existing case", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = makeCase(OWNER_A);
    repo.saveSync(myCase);

    const updated = updateCase(myCase, { noticeType: "irs_cp504" });
    repo.saveSync(updated);

    const loaded = repo.loadSync(myCase.id, OWNER_A);
    assert.equal(loaded.noticeType, "irs_cp504");
  });

  it("deletes a case owned by the caller", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = makeCase(OWNER_A);
    repo.saveSync(myCase);

    const deleted = repo.deleteSync(myCase.id, OWNER_A);
    assert.equal(deleted, true);

    const loaded = repo.loadSync(myCase.id, OWNER_A);
    assert.equal(loaded, null);
  });

  it("does not delete a case owned by another user", () => {
    const repo = new InMemoryCaseRepository();
    const caseA = makeCase(OWNER_A);
    repo.saveSync(caseA);

    const deleted = repo.deleteSync(caseA.id, OWNER_B);
    assert.equal(deleted, false);

    const loaded = repo.loadSync(caseA.id, OWNER_A);
    assert.ok(loaded !== null);
  });

  it("lists case summaries for the owner only", () => {
    const repo = new InMemoryCaseRepository();
    const case1 = makeCase(OWNER_A);
    case1.updatedAt = "2024-01-01T00:00:00Z";
    const case2 = makeCase(OWNER_A);
    case2.updatedAt = "2024-03-01T00:00:00Z";
    const case3 = makeCase(OWNER_B);
    case3.updatedAt = "2024-02-01T00:00:00Z";

    repo.saveSync(case1);
    repo.saveSync(case2);
    repo.saveSync(case3);

    const summariesA = repo.listSummariesSync(OWNER_A);
    assert.equal(summariesA.length, 2);
    assert.equal(summariesA[0].id, case2.id);
    assert.equal(summariesA[1].id, case1.id);

    const summariesB = repo.listSummariesSync(OWNER_B);
    assert.equal(summariesB.length, 1);
    assert.equal(summariesB[0].id, case3.id);
  });

  it("filters by status within owner scope", () => {
    const repo = new InMemoryCaseRepository();
    const c1 = makeCase(OWNER_A);
    const c2 = transitionStatus(makeCase(OWNER_A), "analyzed");
    const c3 = transitionStatus(makeCase(OWNER_B), "analyzed");

    repo.saveSync(c1);
    repo.saveSync(c2);
    repo.saveSync(c3);

    const analyzed = repo.listByStatusSync("analyzed", OWNER_A);
    assert.equal(analyzed.length, 1);
    assert.equal(analyzed[0].id, c2.id);
  });

  it("persists and retrieves audit entries for owned case", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = makeCase(OWNER_A);
    repo.saveSync(myCase);

    const entry = createAuditEntry({
      caseId: myCase.id,
      action: "case_created",
      actor: "system",
      objectType: "case",
      description: "Case created",
    });
    repo.saveAuditSync(entry, OWNER_A);

    const audit = repo.loadAuditSync(myCase.id, OWNER_A);
    assert.equal(audit.length, 1);
    assert.equal(audit[0].action, "case_created");
  });

  it("returns empty audit for another user's case", () => {
    const repo = new InMemoryCaseRepository();
    const caseA = makeCase(OWNER_A);
    repo.saveSync(caseA);

    const entry = createAuditEntry({
      caseId: caseA.id,
      action: "case_created",
      actor: "system",
      objectType: "case",
      description: "Case created",
    });
    repo.saveAuditSync(entry, OWNER_A);

    const audit = repo.loadAuditSync(caseA.id, OWNER_B);
    assert.equal(audit.length, 0, "Cross-user audit load must return empty");
  });

  it("throws when saving audit for another user's case", () => {
    const repo = new InMemoryCaseRepository();
    const caseA = makeCase(OWNER_A);
    repo.saveSync(caseA);

    const entry = createAuditEntry({
      caseId: caseA.id,
      action: "case_created",
      actor: "system",
      objectType: "case",
      description: "Case created",
    });

    assert.throws(
      () => repo.saveAuditSync(entry, OWNER_B),
      (err) => err instanceof RepositoryError && err.code === RepositoryErrorCode.UNAUTHORIZED,
    );
  });

  it("exists returns true only for owned case", () => {
    const repo = new InMemoryCaseRepository();
    const myCase = makeCase(OWNER_A);
    repo.saveSync(myCase);

    assert.equal(repo.existsSync(myCase.id, OWNER_A), true);
    assert.equal(repo.existsSync(myCase.id, OWNER_B), false);
    assert.equal(repo.existsSync("nonexistent", OWNER_A), false);
  });

  it("async save throws for unowned case", async () => {
    const repo = new InMemoryCaseRepository();
    const myCase = createCase("analyze");

    try {
      await repo.save(myCase);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err instanceof RepositoryError);
      assert.equal(err.code, RepositoryErrorCode.VALIDATION_ERROR);
    }
  });

  it("async load returns null for cross-user", async () => {
    const repo = new InMemoryCaseRepository();
    const caseA = makeCase(OWNER_A);
    await repo.save(caseA);

    const loaded = await repo.load(caseA.id, OWNER_B);
    assert.equal(loaded, null);
  });
});
