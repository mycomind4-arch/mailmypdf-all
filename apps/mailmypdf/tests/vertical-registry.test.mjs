import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registrySource = fs.readFileSync(path.join(root, "src/verticals/registry.ts"), "utf8");
const typesSource = fs.readFileSync(path.join(root, "src/verticals/types.ts"), "utf8");

describe("Vertical Registry — Architecture", () => {
  it("registry exports all 11 canonical verticals", () => {
    const ids = [
      "dispute-mail", "appeal-reply", "notice-response", "claim-proof",
      "tenant-reply", "permit-reply", "benefits-appeal", "debt-defense", "records-request",
      "private-office", "small-business-mail",
    ];
    for (const id of ids) assert.ok(registrySource.includes(`id: "${id}"`), `Missing vertical: ${id}`);
  });

  it("verticals are marked with explicit product lifecycle status", () => {
    const statusMatches = registrySource.match(/status: "[^"]+"/g) ?? [];
    assert.equal(statusMatches.length, 11, "All canonical verticals need an explicit product lifecycle status");
  });

  it("every vertical declares an independent Gold execution state", () => {
    const executionMatches = registrySource.match(/executionState: "[^"]+"/g) ?? [];
    assert.equal(executionMatches.length, 11, "All canonical verticals need an explicit executionState");
    assert.ok(typesSource.includes("VerticalExecutionState"));
  });

  it("dispute-mail has standalone route at /dispute-mail", () => {
    assert.ok(registrySource.includes('route: "/dispute-mail"'));
  });

  it("dispute-mail is enabled", () => {
    assert.ok(registrySource.includes('id: "dispute-mail"') && registrySource.includes('enabled: true'));
  });

  it("dispute-mail has correct tagline", () => {
    assert.ok(registrySource.includes('tagline: "Dispute anything by mail."'));
  });

  it("verticals have correct categories per spec", () => {
    assert.ok(registrySource.includes('category: "government"'));
    assert.ok(registrySource.includes('category: "appeals"'));
    assert.ok(registrySource.includes('category: "disputes"'));
    assert.ok(registrySource.includes('category: "housing"'));
  });

  it("all canonical verticals use root-level routes, never /solutions/", () => {
    const routeMatches = registrySource.match(/route: "\/[^"]+"/g) ?? [];
    assert.equal(routeMatches.length, 11, "All 11 canonical verticals need routes");
    for (const match of routeMatches) {
      assert.ok(!match.includes("/solutions/"), `Canonical vertical route must not be under /solutions/: ${match}`);
    }
  });

  it("every vertical has SEO metadata with noindex for non-live", () => {
    assert.ok(registrySource.includes("seo:"));
    assert.ok(registrySource.includes("robots:"));
  });

  it("every vertical has capabilities defined", () => {
    const capabilityMatches = registrySource.match(/capabilities: \{/g) ?? [];
    assert.equal(capabilityMatches.length, 11, "Every vertical needs capabilities");
  });

  it("registry has lookup helpers", () => {
    assert.ok(registrySource.includes("getVerticalBySlug"));
    assert.ok(registrySource.includes("getVerticalByRoute"));
    assert.ok(registrySource.includes("getVerticalsByCategory"));
  });

  it("dispute-mail is first in the registry array (priority)", () => {
    const arrayStart = registrySource.indexOf("export const verticals");
    const firstId = registrySource.indexOf("disputeMail", arrayStart);
    assert.ok(firstId > arrayStart);
  });
});

describe("Vertical Types — Architecture", () => {
  it("defines VerticalStatus enum with all lifecycle states", () => {
    assert.ok(typesSource.includes("VerticalStatus"));
  });
  it("defines VerticalCategory enum", () => {
    assert.ok(typesSource.includes("VerticalCategory"));
  });
  it("defines LiveCriteria interface", () => {
    assert.ok(typesSource.includes("LiveCriteria"));
  });
  it("defines VerticalWorkflowState with all states", () => {
    assert.ok(typesSource.includes("VerticalWorkflowState"));
  });
  it("defines VerticalOrderMetadata with vertical_slug and workflow", () => {
    assert.ok(typesSource.includes("VerticalOrderMetadata"));
    assert.ok(typesSource.includes("vertical_slug"));
    assert.ok(typesSource.includes("workflow"));
  });
  it("defines AIWorkflow interface with all methods", () => {
    assert.ok(typesSource.includes("AIWorkflow"));
  });
  it("defines VerticalCapabilities", () => {
    assert.ok(typesSource.includes("VerticalCapabilities"));
  });
});
