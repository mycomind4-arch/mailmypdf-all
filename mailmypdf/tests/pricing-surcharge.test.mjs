import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");

// ── Recursively collect all source files for the regression scan ────────
async function collectFiles(dir, exts) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".output" || e.name === "dist") continue;
      files.push(...(await collectFiles(full, exts)));
    } else if (exts.has(extname(e.name))) {
      files.push(full);
    }
  }
  return files;
}

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Tests: app pricing delegates to canonical pricing authority ──────────

test("certified and registered surcharges come from @mailmypdf/pricing", async () => {
  const pricing = await source("src/lib/pricing.ts");

  assert.match(
    pricing,
    /certified:\s*getMailSurcharge\("certified"\)/,
    "Certified surcharge must delegate to the canonical pricing package",
  );
  assert.match(
    pricing,
    /registered:\s*getMailSurcharge\("registered"\)/,
    "Registered surcharge must delegate to the canonical pricing package",
  );
  assert.match(
    pricing,
    /FULFILLMENT_COSTS/,
    "Fulfillment cost references should come from the canonical pricing package",
  );
});

test("core page-count pricing launches at $2.99 / $3.99 / $4.99", async () => {
  const pricing = await source("src/lib/pricing.ts");
  assert.match(pricing, /pageCount <= 2\) return PRICES\.standard/);
  assert.match(pricing, /pageCount <= 5\) return 399/);
  assert.match(pricing, /return 499/);
});

test("marketing no longer advertises core mailing from $4.99", async () => {
  const files = await collectFiles(srcDir, new Set([".ts", ".tsx", ".json", ".md", ".html", ".mjs"]));
  const offenders = [];
  for (const f of files) {
    const content = await readFile(f, "utf8");
    if (/from \$4\.99/i.test(content)) offenders.push(f.replace(root + "/", ""));
  }
  assert.deepEqual(offenders, [], `Found stale "from $4.99" marketing copy in: ${offenders.join(", ")}`);
});

// ── Regression test: old literal prices must not appear anywhere ─────────

test("old literal '+$3.99' does not appear in any source file", async () => {
  const files = await collectFiles(srcDir, new Set([".ts", ".tsx", ".json", ".md", ".html", ".mjs"]));
  const offenders = [];
  for (const f of files) {
    const content = await readFile(f, "utf8");
    if (content.includes("+$3.99")) {
      offenders.push(f.replace(root + "/", ""));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Found old "+$3.99" literal in: ${offenders.join(", ")}. These should reference the pricing module instead.`
  );
});

test("old literal '+$6.99' (as registered mail surcharge) does not appear in any source file", async () => {
  const files = await collectFiles(srcDir, new Set([".ts", ".tsx", ".json", ".md", ".html", ".mjs"]));
  const offenders = [];
  for (const f of files) {
    const content = await readFile(f, "utf8");
    // Match "+$6.99" but NOT "$6.99" as a base tier price (medium letter 3-5 pages)
    // The registered mail surcharge was "+$6.99" with "insured" nearby
    if (content.includes("+$6.99")) {
      offenders.push(f.replace(root + "/", ""));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Found old "+$6.99" literal in: ${offenders.join(", ")}. These should reference the pricing module instead.`
  );
});

test("old literal 'price: \"3.99\"' does not appear in JSON-LD / structured data", async () => {
  const files = await collectFiles(srcDir, new Set([".ts", ".tsx"]));
  const offenders = [];
  for (const f of files) {
    const content = await readFile(f, "utf8");
    if (content.includes('price: "3.99"') || content.includes("price: '3.99'")) {
      offenders.push(f.replace(root + "/", ""));
    }
  }
  assert.deepEqual(offenders, [], `Found old price "3.99" literal in: ${offenders.join(", ")}`);
});

test("old literal 'price: \"6.99\"' as registered mail does not appear in JSON-LD", async () => {
  const indexContent = await source("src/routes/index.tsx");
  // Check that the registered mail JSON-LD offer uses the pricing function, not a literal
  assert.doesNotMatch(
    indexContent,
    /Registered Mail.*price:\s*"6\.99"/,
    "Registered Mail JSON-LD should use mailClassSurchargeUsd(), not a hardcoded '6.99'"
  );
});

test("no source file claims certified mail is 'not included' or 'not offered'", async () => {
  const files = await collectFiles(srcDir, new Set([".ts", ".tsx"]));
  const offenders = [];
  for (const f of files) {
    const content = await readFile(f, "utf8");
    // Check for phrases that say certified mail is not available
    const lower = content.toLowerCase();
    // Do not combine unrelated sentences (e.g. certified tracking plus a
    // payment receipt that is "not included" in the evidence export).
    if (!/certified[^\n.!?]{0,100}(?:not included|not currently|not offered)|(?:not included|not currently|not offered)[^\n.!?]{0,100}certified/i.test(content)) continue;
    if (
      (lower.includes("certified") && (lower.includes("not included") || lower.includes("not currently") || lower.includes("not offered"))) ||
      (lower.includes("not included") && lower.includes("certified"))
    ) {
      // Allow the comparison table cell that says "No certified-mail proof" (that's about standard mail)
      if (!content.includes("No certified-mail proof")) {
        offenders.push(f.replace(root + "/", ""));
      } else {
        // If the file has "No certified-mail proof" but also has other "not included" references for certified
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const ll = lines[i].toLowerCase();
          if ((ll.includes("certified") && (ll.includes("not included") || ll.includes("not currently") || ll.includes("not offered")))) {
            // Check it's not the comparison table cell
            if (!ll.includes("no certified-mail proof")) {
              offenders.push(`${f.replace(root + "/", "")}:${i + 1}`);
            }
          }
        }
      }
    }
  }
  // Deduplicate
  const unique = [...new Set(offenders)];
  assert.deepEqual(
    unique,
    [],
    `Found files claiming certified mail is 'not included'/'not offered': ${unique.join(", ")}`
  );
});
