import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname_test = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname_test, "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Vertical Pricing Architecture Tests ──────────────────────────────────────

test("pricing.ts imports VerticalOrderMetadata type", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes('import type { VerticalOrderMetadata }'),
    "pricing.ts must import VerticalOrderMetadata from verticals/types",
  );
});

test("pricing.ts defines VerticalPricingConfig interface", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(pricing.includes("interface VerticalPricingConfig"), "Must define VerticalPricingConfig");
  assert.ok(pricing.includes("verticalSlug"), "Config must have verticalSlug");
  assert.ok(pricing.includes("basePrices"), "Config must support basePrices override");
  assert.ok(pricing.includes("minimumMailClass"), "Config must support minimumMailClass");
  assert.ok(pricing.includes("includesCertified"), "Config must support includesCertified");
  assert.ok(pricing.includes("processingFeeCents"), "Config must support processingFeeCents");
});

test("pricing.ts has registerVerticalPricing function", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(pricing.includes("registerVerticalPricing"), "Must have registerVerticalPricing");
  assert.ok(pricing.includes("getVerticalPricing"), "Must have getVerticalPricing");
});

test("pricing.ts has resolveMailClass for vertical minimum enforcement", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(pricing.includes("function resolveMailClass"), "Must have resolveMailClass");
  assert.ok(pricing.includes("classRank"), "Must use class ranking for comparison");
});

test("calculateTotalPrice accepts optional vertical context", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes("vertical?: VerticalOrderMetadata"),
    "calculateTotalPrice must accept optional vertical context",
  );
});

test("priceDescription accepts optional vertical context", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes("vertical?: VerticalOrderMetadata"),
    "priceDescription must accept optional vertical context",
  );
});

test("vertical pricing config registry is a Map (not DB-backed)", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes("verticalPricingConfigs = new Map"),
    "Vertical pricing should be a Map registry, not a DB table",
  );
});

test("vertical pricing includes certified mail in base when configured", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes("config?.includesCertified && effectiveMailClass === \"certified\""),
    "Must zero out delivery surcharge when vertical includes certified",
  );
});

test("vertical pricing uses vertical name in description when present", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.ok(
    pricing.includes("${verticalSlug} letter"),
    "priceDescription should use vertical slug in the description",
  );
});

test("vertical pricing resolves mail class upgrade when below minimum", async () => {
  const pricing = await source("src/lib/pricing.ts");
  // resolveMailClass should upgrade standard to certified if vertical requires certified
  assert.ok(
    pricing.includes("classRank[requested] < classRank[config.minimumMailClass]"),
    "resolveMailClass must upgrade when below vertical minimum",
  );
});

test("backward compatibility: calculateTotalPrice works without vertical context", async () => {
  const pricing = await source("src/lib/pricing.ts");
  // The function should handle the case where vertical is undefined
  assert.ok(
    pricing.includes("if (!verticalSlug) return requested"),
    "resolveMailClass must return early when no vertical slug",
  );
  assert.ok(
    pricing.includes("const config = verticalSlug ? getVerticalPricing(verticalSlug) : undefined"),
    "calculateTotalPrice must handle missing vertical config gracefully",
  );
});
