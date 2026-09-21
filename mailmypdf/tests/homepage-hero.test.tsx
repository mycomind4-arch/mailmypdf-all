import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { HomepageHeroImage } from "../src/components/homepage-hero-image";

test("hero serves art-directed mobile and desktop images without lazy-loading the main image", () => {
  const html = renderToStaticMarkup(<HomepageHeroImage />);
  assert.match(html, /<picture/);
  assert.match(html, /media="\(max-width: 639px\)"/);
  assert.match(html, /hero-mobile-v2-400.webp 400w/);
  assert.match(html, /hero-desktop-v2-1448.webp 1448w/);
  assert.match(html, /fetchPriority="high"/i);
  assert.match(html, /loading="eager"/);
  assert.match(html, /width="1448" height="1086"/);
  assert.match(html, /alt="MailMyPDF envelope/);
  for (const path of new Set(html.match(/\/homepage\/hero-[\w-]+\.webp/g))) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Missing asset ${path}`);
  }
});
