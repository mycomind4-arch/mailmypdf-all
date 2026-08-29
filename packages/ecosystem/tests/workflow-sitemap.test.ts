import assert from "node:assert/strict";
import test from "node:test";
import { buildEcosystemSitemap, renderSitemapXml } from "../src/workflow-sitemap.js";

test("prelaunch sitemap contains no indexable URLs", () => {
  const entries = buildEcosystemSitemap({ launchReady: false });
  assert.ok(entries.length > 0);
  assert.equal(entries.every((entry) => !entry.indexable), true);
  assert.equal(renderSitemapXml(entries).includes("<url>"), false);
});

test("launch sitemap includes canonical workflow URLs", () => {
  const entries = buildEcosystemSitemap({ launchReady: true });
  assert.ok(entries.some((entry) => entry.loc === "https://mailmypdf.ai/notice/cp2000-response"));
  const xml = renderSitemapXml(entries);
  assert.match(xml, /mailmypdf\.ai\/notice\/cp2000-response/);
});
