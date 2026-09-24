import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { renderRobotsTxt } from "../src/lib/robots";
import { sitemapRoutes } from "../src/lib/sitemap";
import { createWorkflowSchema } from "../../packages/seo/src/workflow-head";
import cp14Config from "../../notice-respond/workflows/cp14-response/config";
import cp2000Config from "../../notice-respond/workflows/cp2000-response/config";
import cp504Config from "../../notice-respond/workflows/cp504-response/config";

test("robots.txt explicitly allows OAI-SearchBot on public routes", () => {
  const robots = renderRobotsTxt("https://example.com");

  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.match(robots, /User-agent: \*\nAllow: \//);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);

  for (const path of ["/api/", "/admin", "/orders/", "/auth", "/verify", "/send$"]) {
    assert.ok(robots.includes(`Disallow: ${path}`));
  }
});

test("shared SEO metadata uses the production canonical origin", async () => {
  const seoSource = await readFile(
    fileURLToPath(new URL("../../packages/seo/src/section-head.ts", import.meta.url)),
    "utf8",
  );

  assert.match(seoSource, /https:\/\/mailmypdf\.ai/);
  assert.doesNotMatch(seoSource, /mailmypdf\.pages\.dev/);
});

test("new-architecture IRS response pages are present in the sitemap", () => {
  const paths = new Set(sitemapRoutes().map((route) => route.loc));

  assert.ok(paths.has("/notice-respond/workflows/cp14-response"));
  assert.ok(paths.has("/notice-respond/workflows/cp2000-response"));
  assert.ok(paths.has("/notice-respond/workflows/cp504-response"));
});

test("flagship IRS workflows expose structured AI discovery context", () => {
  for (const config of [cp14Config, cp2000Config, cp504Config]) {
    assert.ok(config.discovery.primaryQuestion.endsWith("?"));
    assert.ok((config.discovery.alternateQuestions?.length ?? 0) >= 3);
    assert.equal(config.discovery.agency, "Internal Revenue Service");
    assert.equal(config.discovery.jurisdiction, "United States");
    assert.ok(config.discovery.documentType.length > 10);

    const schemas = createWorkflowSchema(config);
    const page = schemas.find((schema) => schema["@type"] === "WebPage");
    assert.ok(page);
    assert.equal(page.url, `https://mailmypdf.ai${config.path}`);
    assert.ok(String(page.keywords).includes(config.discovery.primaryQuestion));
    assert.deepEqual(page.citation, config.sources?.map((source) => source.href));
  }
});
