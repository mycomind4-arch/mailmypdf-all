import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sectionSource = fs.readFileSync(path.join(root, "src/lib/section-registry.ts"), "utf8");
const registrySource = fs.readFileSync(path.join(root, "src/verticals/registry.ts"), "utf8");
const typesSource = fs.readFileSync(path.join(root, "src/verticals/types.ts"), "utf8");

const sectionIds = [...sectionSource.matchAll(/^\s{4}id: "([^"]+)",$/gm)].map((match) => match[1]);

describe("Canonical Section Registry", () => {
  it("contains the 15 root-level MailMyPDF sections", () => {
    assert.deepEqual(sectionIds.sort(), [
      "appeal-mail",
      "benefits-appeal",
      "claim-proof",
      "code-enforcement",
      "dispute-mail",
      "immigration-mail",
      "insurance-claims",
      "legal-defense",
      "notice-respond",
      "permit-reply",
      "private-office",
      "records-request",
      "secured-transactions",
      "small-business",
      "tenant-reply",
    ]);
  });

  it("uses exact root-level section paths", () => {
    const paths = [...sectionSource.matchAll(/^\s{4}path: "(\/[^"]+)",$/gm)].map((match) => match[1]);
    assert.equal(paths.length, 15);
    for (const id of sectionIds) assert.ok(paths.includes(`/${id}`), `Missing canonical path for ${id}`);
  });

  it("gives every section lifecycle, execution, and capability metadata", () => {
    assert.equal((sectionSource.match(/^\s{4}status: /gm) || []).length, 15);
    assert.equal((sectionSource.match(/^\s{4}executionState: /gm) || []).length, 15);
    assert.equal((sectionSource.match(/^\s{4}capabilities: \{/gm) || []).length, 15);
  });

  it("keeps old vertical names as compatibility aliases, not canonical ids", () => {
    for (const legacy of ["appeal-reply", "notice-response", "debt-defense", "small-business-mail"]) {
      assert.ok(!sectionIds.includes(legacy));
      assert.match(sectionSource, new RegExp(`"${legacy}":`));
    }
  });
});

describe("Legacy Vertical Compatibility API", () => {
  it("derives the legacy vertical array from the section registry", () => {
    assert.match(registrySource, /SECTION_REGISTRY\.map\(toVertical\)/);
    assert.match(registrySource, /resolveSectionId/);
    assert.match(registrySource, /LEGACY_SECTION_ALIASES/);
  });

  it("retains the existing vertical API surface during migration", () => {
    for (const helper of [
      "getVerticalBySlug",
      "getVerticalByRoute",
      "getVerticalsByCategory",
      "getVerticalsByStatus",
      "getNavigationVerticals",
      "getLiveVerticals",
    ]) {
      assert.ok(registrySource.includes(helper));
    }
    assert.ok(typesSource.includes("VerticalDefinition"));
  });
});
