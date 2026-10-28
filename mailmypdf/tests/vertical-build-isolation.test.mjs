import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

test("Turbo builds dependencies before running sibling build and test tasks", async () => {
  const turbo = await readJson("../../turbo.json");
  for (const task of ["build", "test"]) {
    assert.ok(
      turbo.tasks[task].dependsOn.includes("^build"),
      `Turbo ${task} must build workspace dependencies first`,
    );
  }
});

test("private-office CI tasks do not rebuild shared workflow output during sibling tests", async () => {
  const pkg = await readJson("../../apps/verticals/private-office/package.json");
  assert.equal(pkg.dependencies["@mailmypdf/workflows"], "workspace:*");
  for (const task of ["build", "test"]) {
    assert.doesNotMatch(
      pkg.scripts[task],
      /build:shared|pnpm\s+--filter\s+@mailmypdf\//,
      `private-office ${task} must use Turbo's already-built dependencies`,
    );
  }
  // Standalone local development can still explicitly build shared packages.
  assert.match(pkg.scripts.dev, /build:shared/);
  assert.match(pkg.scripts["build:shared"], /@mailmypdf\/workflows build/);
});

// Turbo's ^build already orders dependencies. Nested shared builds from
// concurrent vertical tasks can overwrite dist/ while another Vite bundler
// reads it (observed in the scheduled immigration-mail factory build).
test("other vertical CI builds must not recompile shared step-workflow outputs", async () => {
  for (const vertical of ["appeal-mail", "immigration-mail", "notice-respond"]) {
    const pkg = await readJson(`../../apps/verticals/${vertical}/package.json`);
    assert.equal(pkg.dependencies["@mailmypdf/step-workflow"], "workspace:*");
    assert.equal(pkg.scripts.build, "vite build", `${vertical} must use Turbo-built dependencies`);
    assert.match(pkg.scripts.dev, /build:shared/, `${vertical} dev must still build shared dependencies`);
    assert.ok(pkg.scripts["build:shared"].includes("@mailmypdf/step-workflow build"));
    assert.match(pkg.scripts["verify:launch"], /build:shared/, `${vertical} standalone launch verification must build shared dependencies`);
  }
});
