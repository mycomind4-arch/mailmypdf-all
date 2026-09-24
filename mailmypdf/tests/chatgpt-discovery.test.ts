import assert from "node:assert/strict";
import test from "node:test";

import { renderRobotsTxt } from "../src/lib/robots";
import { sitemapRoutes } from "../src/lib/sitemap";

test("robots.txt explicitly allows OAI-SearchBot on public routes", () => {
  const robots = renderRobotsTxt("https://example.com");

  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.match(robots, /User-agent: \*\nAllow: \//);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);

  for (const path of ["/api/", "/admin", "/orders/", "/auth", "/verify", "/send$"]) {
    assert.ok(robots.includes(`Disallow: ${path}`));
  }
});

test("new-architecture IRS response pages are present in the sitemap", () => {
  const paths = new Set(sitemapRoutes().map((route) => route.loc));

  assert.ok(paths.has("/notice-respond/workflows/cp14-response"));
  assert.ok(paths.has("/notice-respond/workflows/cp2000-response"));
  assert.ok(paths.has("/notice-respond/workflows/cp504-response"));
});
