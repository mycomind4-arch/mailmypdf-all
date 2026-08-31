/* ═══════════════════════════════════════════════════════════
   DOMAIN OWNERSHIP VALIDATION TESTS

   Tests that prove:
   - Valid domain/repo combinations pass
   - Dispute-mail workflows cannot claim notice-respond ownership
   - Notice-respond workflows cannot accidentally claim another vertical
   - Unknown domains fail
   - Duplicate ownership is detected
   - Cross-domain contamination is caught
   - All current registry entries pass ownership validation after correction

   ═══════════════════════════════════════════════════════════ */

import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import {
  CANONICAL_DOMAINS,
  validateDomainOwnership,
  validateRegistryOwnership,
  isValidOwnership,
  getDomain,
  getCanonicalRepo,
  listDomains,
  type WorkflowOwnershipEntry,
} from "../canonical-domains";
import { WORKFLOW_REGISTRY } from "../workflow-master-registry";

// ── Helper: extract registry entries for validation ──────────

function registryToOwnershipEntries(): WorkflowOwnershipEntry[] {
  return WORKFLOW_REGISTRY.map((w) => ({
    id: w.id,
    vertical: w.vertical,
    repo: w.repo,
    engine: w.engine,
  }));
}

// ── Tests ────────────────────────────────────────────────────

describe("Canonical Domains Registry", () => {
  it("has all 12 canonical domains", () => {
    const domains = listDomains();
    assert.equal(domains.length, 12);
  });

  it("every domain has a unique canonical repo", () => {
    const repos = listDomains().map((d) => d.canonicalRepo);
    const unique = new Set(repos);
    assert.equal(unique.size, repos.length);
  });

  it("every domain has required fields", () => {
    for (const domain of listDomains()) {
      assert.ok(domain.id);
      assert.ok(domain.name);
      assert.ok(domain.canonicalRepo);
      assert.ok(domain.description);
      assert.ok(domain.primaryEngines.length > 0);
      assert.ok(domain.ownershipRule);
      assert.equal(domain.repoExists, true);
      assert.ok(["active", "planned", "research"].includes(domain.status));
    }
  });

  it("notice-respond domain is correctly defined", () => {
    const domain = getDomain("notice-respond");
    assert.ok(domain);
    assert.equal(domain!.canonicalRepo, "notice-respond");
    assert.ok(domain!.primaryEngines.includes("document-action"));
    assert.equal(domain!.status, "active");
  });

  it("dispute-mail domain is correctly defined", () => {
    const domain = getDomain("dispute-mail");
    assert.ok(domain);
    assert.equal(domain!.canonicalRepo, "dispute-mail");
    assert.ok(domain!.primaryEngines.includes("dispute"));
    assert.equal(domain!.status, "active");
  });
});

describe("validateDomainOwnership — single entry", () => {
  it("passes for valid notice-respond workflow", () => {
    const result = validateDomainOwnership({
      id: "cp2000-response",
      vertical: "notice-respond",
      repo: "notice-respond",
      engine: "document-action",
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("passes for valid dispute-mail workflow", () => {
    const result = validateDomainOwnership({
      id: "transunion-dispute",
      vertical: "dispute-mail",
      repo: "dispute-mail",
      engine: "dispute",
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("fails when vertical/repo mismatch — dispute workflow in notice-respond repo", () => {
    const result = validateDomainOwnership({
      id: "equifax-dispute",
      vertical: "dispute-mail",
      repo: "notice-respond",
      engine: "dispute",
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.join(" ").includes("Repo mismatch"));
    assert.ok(result.errors.join(" ").includes("dispute-mail"));
    assert.ok(result.errors.join(" ").includes("notice-respond"));
  });

  it("fails when vertical/repo mismatch — IRS notice in dispute-mail repo", () => {
    const result = validateDomainOwnership({
      id: "cp14-response",
      vertical: "notice-respond",
      repo: "dispute-mail",
      engine: "document-action",
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.join(" ").includes("Repo mismatch"));
  });

  it("fails for unknown vertical", () => {
    const result = validateDomainOwnership({
      id: "test-workflow",
      vertical: "nonexistent-domain",
      repo: "nonexistent-domain",
      engine: "document-action",
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.join(" ").includes("Unknown vertical"));
  });

  it("fails for unknown repo", () => {
    const result = validateDomainOwnership({
      id: "test-workflow",
      vertical: "notice-respond",
      repo: "nonexistent-repo",
      engine: "document-action",
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.join(" ").includes("Unknown repo"));
  });

  it("warns when engine is not a primary engine for the domain", () => {
    const result = validateDomainOwnership({
      id: "test-workflow",
      vertical: "notice-respond",
      repo: "notice-respond",
      engine: "appeal" as any,
    });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings.join(" ").includes("not a primary engine"));
  });
});

describe("validateRegistryOwnership — full registry", () => {
  it("all current registry entries pass ownership validation", () => {
    const entries = registryToOwnershipEntries();
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, true);
    assert.equal(result.invalidCount, 0);
    assert.equal(result.errors.length, 0);
  });

  it("detects duplicate workflow IDs", () => {
    const entries: WorkflowOwnershipEntry[] = [
      { id: "cp2000-response", vertical: "notice-respond", repo: "notice-respond", engine: "document-action" },
      { id: "cp2000-response", vertical: "notice-respond", repo: "notice-respond", engine: "document-action" },
    ];
    const result = validateRegistryOwnership(entries);
    assert.ok(result.duplicateIds.includes("cp2000-response"));
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("Duplicate workflow ID"));
  });

  it("detects cross-domain contamination — credit dispute in notice-respond", () => {
    const entries: WorkflowOwnershipEntry[] = [
      { id: "equifax-dispute", vertical: "notice-respond", repo: "notice-respond", engine: "dispute" },
    ];
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("Cross-domain contamination"));
    assert.ok(result.errors.join(" ").includes("equifax-dispute"));
    assert.ok(result.errors.join(" ").includes("dispute-mail"));
  });

  it("detects cross-domain contamination — IRS notice in dispute-mail", () => {
    const entries: WorkflowOwnershipEntry[] = [
      { id: "cp14-response", vertical: "dispute-mail", repo: "dispute-mail", engine: "document-action" },
    ];
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("Cross-domain contamination"));
    assert.ok(result.errors.join(" ").includes("cp14-response"));
    assert.ok(result.errors.join(" ").includes("notice-respond"));
  });

  it("detects cross-domain contamination — FOIA in notice-respond", () => {
    const entries: WorkflowOwnershipEntry[] = [
      { id: "foia-request", vertical: "notice-respond", repo: "notice-respond", engine: "records" },
    ];
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("Cross-domain contamination"));
    assert.ok(result.errors.join(" ").includes("foia-request"));
    assert.ok(result.errors.join(" ").includes("records-requests"));
  });

  it("detects cross-domain contamination — insurance in notice-respond", () => {
    const entries: WorkflowOwnershipEntry[] = [
      { id: "insurance-claim-denied", vertical: "notice-respond", repo: "notice-respond", engine: "appeal" },
    ];
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("Cross-domain contamination"));
    assert.ok(result.errors.join(" ").includes("insurance"));
  });

  it("rejects a contaminated registry — equifax-dispute claiming notice-respond ownership", () => {
    // Simulate the OLD state before our fix
    const entries = registryToOwnershipEntries().map((e) =>
      e.id === "equifax-dispute"
        ? { ...e, vertical: "notice-respond", repo: "notice-respond" }
        : e
    );
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("equifax-dispute"));
    assert.ok(result.errors.join(" ").includes("Cross-domain contamination"));
  });

  it("rejects a contaminated registry — transunion-dispute claiming notice-respond ownership", () => {
    const entries = registryToOwnershipEntries().map((e) =>
      e.id === "transunion-dispute"
        ? { ...e, vertical: "notice-respond", repo: "notice-respond" }
        : e
    );
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("transunion-dispute"));
  });

  it("rejects a contaminated registry — cp2000-response claiming dispute-mail ownership", () => {
    const entries = registryToOwnershipEntries().map((e) =>
      e.id === "cp2000-response"
        ? { ...e, vertical: "dispute-mail", repo: "dispute-mail" }
        : e
    );
    const result = validateRegistryOwnership(entries);
    assert.equal(result.allValid, false);
    assert.ok(result.errors.join(" ").includes("cp2000-response"));
    assert.ok(result.errors.join(" ").includes("notice-respond"));
  });

  it("reports correct counts", () => {
    const entries = registryToOwnershipEntries();
    const result = validateRegistryOwnership(entries);
    assert.equal(result.totalEntries, entries.length);
    assert.equal(result.validCount, entries.length);
    assert.equal(result.invalidCount, 0);
  });
});

describe("isValidOwnership — helper", () => {
  it("returns true for valid combinations", () => {
    assert.equal(isValidOwnership("notice-respond", "notice-respond"), true);
    assert.equal(isValidOwnership("dispute-mail", "dispute-mail"), true);
    assert.equal(isValidOwnership("appeal-mail", "appeal-mail"), true);
  });

  it("returns false for mismatched combinations", () => {
    assert.equal(isValidOwnership("notice-respond", "dispute-mail"), false);
    assert.equal(isValidOwnership("dispute-mail", "notice-respond"), false);
  });

  it("returns false for unknown domains", () => {
    assert.equal(isValidOwnership("unknown-domain", "unknown-domain"), false);
  });
});

describe("getCanonicalRepo — helper", () => {
  it("returns the canonical repo for a known domain", () => {
    assert.equal(getCanonicalRepo("notice-respond"), "notice-respond");
    assert.equal(getCanonicalRepo("dispute-mail"), "dispute-mail");
    assert.equal(getCanonicalRepo("appeal-mail"), "appeal-mail");
    assert.equal(getCanonicalRepo("immigration-mail"), "immigration-mail");
  });

  it("returns undefined for unknown domain", () => {
    assert.equal(getCanonicalRepo("nonexistent"), undefined);
  });
});
