import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");

test("every homepage image asset the route references exists", () => {
  const paths = new Set(source.match(/\/homepage\/[\w-]+\.(?:webp|png|jpg)/g));
  assert.ok(paths.size > 0, "expected homepage image references");
  for (const path of paths) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Missing asset ${path}`);
  }
});

test("hero letter/envelope composition is decorative and hidden from assistive tech", () => {
  const visual = source.slice(source.indexOf("function HeroLetterVisual"));
  assert.match(visual, /<div aria-hidden/);
});

test("hero trust strip and promise band avoid unverifiable popularity and testimonial claims", () => {
  const hero = source.slice(source.indexOf("function HomepageHero"), source.indexOf("function HomepageFinalCta"));
  for (const claim of [/Trusted by Thousands/i, /Join thousands/i, /Real Customer/i, /Court-Ready/i]) {
    assert.doesNotMatch(hero, claim);
  }
});
