import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MOUNTED_WORKFLOW_SEO_CONFIGS, sitemapRoutes, renderSitemapXml } from "../src/lib/sitemap";
import { renderRobotsTxt, ROBOTS_DISALLOW } from "../src/lib/robots";
import { WORKFLOW_REGISTRY } from "../src/lib/workflow-registry";
import { SEO_PAGES } from "../src/lib/seo-pages";
import { workflowAuthorityPages } from "../src/lib/workflow-authority-registry";

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ORIGIN = "https://mailmypdf.example";

function locs(): string[] {
  return [...renderSitemapXml(ORIGIN).matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => loc);
}

test("every canonical section contributes its landing and workflows routes", () => {
  const paths = new Set(sitemapRoutes().map((route) => route.loc));
  const sections = new Set(WORKFLOW_REGISTRY.map((workflow) => workflow.sectionId));

  assert.ok(sections.size > 0, "WORKFLOW_REGISTRY must contain sections");
  for (const section of sections) {
    const sectionPath = `/${section}`;
    assert.ok(paths.has(sectionPath), `sitemap is missing ${sectionPath}`);
    assert.ok(
      paths.has(`${sectionPath}/workflows`),
      `sitemap is missing ${sectionPath}/workflows`,
    );
  }
});

test("indexable workflow authority pages are advertised", () => {
  const paths = new Set(sitemapRoutes().map((route) => route.loc));
  const pages = workflowAuthorityPages();

  // How many pages clear the authority gate is editorial and moves with
  // content review, so assert the wiring in both directions rather than a
  // count. As of this test's revision the whole catalog is still DRAFT.
  assert.ok(pages.length > 0, "workflow authority registry must not be empty");
  for (const page of pages.filter((page) => page.indexable)) {
    assert.ok(paths.has(page.path), `sitemap is missing indexable workflow ${page.path}`);
  }
});

test("non-indexable workflow authority pages stay out of the sitemap", () => {
  const paths = new Set(sitemapRoutes().map((route) => route.loc));
  const separatelyReviewed = new Set(
    MOUNTED_WORKFLOW_SEO_CONFIGS.filter((config) => config.indexable).map((config) => config.path),
  );
  const hidden = workflowAuthorityPages().filter((page) => !page.indexable);

  for (const page of hidden) {
    if (separatelyReviewed.has(page.path)) continue;
    assert.ok(!paths.has(page.path), `sitemap leaks non-indexable workflow ${page.path}`);
  }
});

test("the rendered sitemap emits one absolute, deduplicated loc per route", () => {
  const routes = sitemapRoutes();
  const emitted = locs();

  assert.equal(emitted.length, routes.length);
  assert.equal(new Set(emitted).size, emitted.length, "duplicate <loc> entries");
  for (const loc of emitted) assert.ok(loc.startsWith(`${ORIGIN}/`), `not absolute: ${loc}`);

  // Regression: the whole sitemap was once served from a stale checked-in
  // public/sitemap.xml that held only the static + SEO pages.
  const seoAndStaticOnly = SEO_PAGES.length + 12;
  assert.ok(
    emitted.length > seoAndStaticOnly,
    `sitemap has ${emitted.length} entries — verticals/workflows appear to be missing`,
  );
});

test("robots.txt never disallows a route the sitemap advertises", () => {
  const advertised = sitemapRoutes().map((route) => route.loc);

  for (const rule of ROBOTS_DISALLOW) {
    const anchored = rule.endsWith("$");
    const prefix = anchored ? rule.slice(0, -1) : rule;
    const blocked = advertised.filter((loc) => (anchored ? loc === prefix : loc.startsWith(prefix)));
    assert.deepEqual(
      blocked,
      [],
      `robots rule "${rule}" blocks indexable route(s): ${blocked.join(", ")}`,
    );
  }
});

test("robots.txt points crawlers at the canonical sitemap", () => {
  assert.match(renderRobotsTxt(ORIGIN), new RegExp(`^Sitemap: ${ORIGIN}/sitemap\\.xml$`, "m"));
});

// Root-cause guard. The Cloudflare Workers entry short-circuits any path present
// in public/ to the ASSETS binding before the router runs, so a file there with
// the same served path as a route silently replaces that route's response.
test("no file in public/ shadows a server route", () => {
  const served = new Set<string>();
  const walk = (dir: string, base: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, `${base}${entry}/`);
      else served.add(`${base}${entry}`);
    }
  };
  walk(join(APP_ROOT, "public"), "/");

  // e.g. "sitemap[.]xml.ts" declares the route path "/sitemap.xml"
  const routePaths = readdirSync(join(APP_ROOT, "src/routes"))
    .filter((name) => name.includes("[.]") && /\.tsx?$/.test(name))
    .map((name) => `/${name.replace(/\.tsx?$/, "").replaceAll("[.]", ".")}`);

  assert.ok(routePaths.length > 0, "expected at least one extension-style route");
  for (const routePath of routePaths) {
    assert.ok(
      !served.has(routePath),
      `public${routePath} shadows the ${routePath} route — the static file wins and the route never runs`,
    );
  }
});
