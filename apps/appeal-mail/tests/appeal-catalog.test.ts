import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  APPEAL_CATALOG,
  CATEGORY_ORDER,
  validateCatalog,
  getWorkflowBySlug,
  getWorkflowsByCategory,
  searchWorkflows,
  getCatalogStats,
  getImplementedWorkflows,
  getComingSoonWorkflows,
  type AppealWorkflowEntry,
} from "../src/domain/appeal-catalog";

/* ═══════════════════════════════════════════════════════════
   Appeal Mail — Workflow Catalog Tests
   ═══════════════════════════════════════════════════════════ */

describe("Workflow Catalog Integrity", () => {
  test("catalog is non-empty", () => {
    assert.ok(APPEAL_CATALOG.length > 0, "Catalog should have entries");
  });

  test("all entries pass validation", () => {
    const { valid, errors } = validateCatalog();
    assert.ok(valid, `Validation errors: ${errors.join("; ")}`);
  });

  test("all slugs are unique", () => {
    const slugs = APPEAL_CATALOG.map((w) => w.slug);
    const unique = new Set(slugs);
    assert.equal(slugs.length, unique.size, "Duplicate slugs found");
  });

  test("all routes are unique", () => {
    const routes = APPEAL_CATALOG.map((w) => w.route);
    const unique = new Set(routes);
    assert.equal(routes.length, unique.size, "Duplicate routes found");
  });

  test("all routes start with /appeal/", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(
        w.route.startsWith("/appeal/"),
        `Route "${w.route}" for "${w.slug}" should start with /appeal/`
      );
    }
  });

  test("all entries have valid status", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(
        w.status === "IMPLEMENTED" || w.status === "COMING_SOON",
        `Invalid status "${w.status}" for "${w.slug}"`
      );
    }
  });

  test("all entries have SEO title and description", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(w.seoTitle.length > 5, `Missing SEO title for "${w.slug}"`);
      assert.ok(w.seoDescription.length > 20, `Missing SEO description for "${w.slug}"`);
    }
  });

  test("all entries have a primary keyword", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(w.primaryKeyword.length > 2, `Missing primary keyword for "${w.slug}"`);
    }
  });

  test("all entries have a category in CATEGORY_ORDER", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(
        CATEGORY_ORDER.includes(w.category),
        `Category "${w.category}" for "${w.slug}" not in CATEGORY_ORDER`
      );
    }
  });

  test("all entries have an engine defined", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(w.engine.length > 3, `Missing engine for "${w.slug}"`);
    }
  });

  test("all entries have content arrays", () => {
    for (const w of APPEAL_CATALOG) {
      assert.ok(w.whatWeAnalyze.length > 0, `Missing whatWeAnalyze for "${w.slug}"`);
      assert.ok(w.whatYouNeed.length > 0, `Missing whatYouNeed for "${w.slug}"`);
      assert.ok(w.whatWeIdentify.length > 0, `Missing whatWeIdentify for "${w.slug}"`);
      assert.ok(w.whatAppealAddresses.length > 0, `Missing whatAppealAddresses for "${w.slug}"`);
    }
  });
});

describe("Implemented vs Coming Soon", () => {
  test("COMING_SOON workflows are not executable", () => {
    for (const w of APPEAL_CATALOG) {
      if (w.status === "COMING_SOON") {
        assert.equal(w.executable, false, `"${w.slug}" is COMING_SOON but executable`);
      }
    }
  });

  test("IMPLEMENTED workflows are executable", () => {
    for (const w of APPEAL_CATALOG) {
      if (w.status === "IMPLEMENTED") {
        assert.equal(w.executable, true, `"${w.slug}" is IMPLEMENTED but not executable`);
      }
    }
  });

  test("coming soon count is greater than implemented count", () => {
    const implemented = getImplementedWorkflows();
    const comingSoon = getComingSoonWorkflows();
    assert.ok(
      comingSoon.length >= implemented.length,
      "Expected more coming soon than implemented in this milestone"
    );
  });
});

describe("Category Structure", () => {
  test("CATEGORY_ORDER has 7 categories", () => {
    assert.equal(CATEGORY_ORDER.length, 7);
  });

  test("each category has at least one workflow", () => {
    for (const cat of CATEGORY_ORDER) {
      const workflows = getWorkflowsByCategory(cat);
      assert.ok(workflows.length > 0, `Category "${cat}" has no workflows`);
    }
  });

  test("all catalog entries have categories in CATEGORY_ORDER", () => {
    const validCategories = new Set(CATEGORY_ORDER);
    for (const w of APPEAL_CATALOG) {
      assert.ok(validCategories.has(w.category), `"${w.slug}" has unknown category "${w.category}"`);
    }
  });
});

describe("Workflow Search", () => {
  test("empty query returns all workflows", () => {
    const results = searchWorkflows("");
    assert.equal(results.length, APPEAL_CATALOG.length);
  });

  test("search by title", () => {
    const results = searchWorkflows("insurance");
    assert.ok(results.length > 0, "Should find insurance workflows");
    assert.ok(results.some((w) => w.title.includes("Insurance")));
  });

  test("search by keyword", () => {
    const results = searchWorkflows("SSI");
    assert.ok(results.length > 0, "Should find SSI workflows");
    assert.ok(results.some((w) => w.slug === "ssi"));
  });

  test("search by category", () => {
    const results = searchWorkflows("unemployment");
    assert.ok(results.length > 0, "Should find unemployment workflows");
    assert.ok(results.some((w) => w.category === "Unemployment"));
  });

  test("search 'workers comp' finds workers comp", () => {
    const results = searchWorkflows("workers comp");
    assert.ok(results.length > 0, "Should find workers comp workflows");
    assert.ok(results.some((w) => w.slug === "workers-comp"));
  });

  test("search 'VA' finds VA claim", () => {
    const results = searchWorkflows("VA");
    assert.ok(results.length > 0, "Should find VA workflows");
    assert.ok(results.some((w) => w.slug === "va-claim"));
  });

  test("nonsense search returns empty", () => {
    const results = searchWorkflows("xyzzyquack");
    assert.equal(results.length, 0);
  });
});

describe("Catalog Stats", () => {
  test("stats are consistent", () => {
    const stats = getCatalogStats();
    assert.equal(stats.total, APPEAL_CATALOG.length);
    assert.equal(stats.implemented + stats.comingSoon, stats.total);
  });
});

describe("getWorkflowBySlug", () => {
  test("returns workflow for valid slug", () => {
    const w = getWorkflowBySlug("insurance-claim");
    assert.ok(w);
    assert.equal(w.slug, "insurance-claim");
  });

  test("returns undefined for invalid slug", () => {
    const w = getWorkflowBySlug("nonexistent-slug");
    assert.equal(w, undefined);
  });
});
