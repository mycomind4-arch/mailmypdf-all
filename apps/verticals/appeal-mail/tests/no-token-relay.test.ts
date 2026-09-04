import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/* ═══════════════════════════════════════════════════════════
   No Cross-Origin Token Relay

   Appeal Mail previously propagated the Supabase session to
   eleven other product origins by putting access_token and
   refresh_token in a URL hash fragment and loading that URL in
   hidden iframes.  Fragments land in browser history, in
   referrers, and in anything reading the address bar, so this
   distributed live credentials across origins we do not control.

   These tests FAIL the build if that relay returns in any form.
   ═══════════════════════════════════════════════════════════ */

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC).filter((f) => !f.endsWith("routeTree.gen.ts"));

describe("No cross-origin token relay", () => {
  test("the sso-propagate module is gone", () => {
    assert.equal(
      existsSync(join(SRC, "lib", "sso-propagate.ts")),
      false,
      "src/lib/sso-propagate.ts relayed session tokens across origins and must not return",
    );
  });

  test("the token-receiving sso-callback route is gone", () => {
    assert.equal(
      existsSync(join(SRC, "routes", "auth", "sso-callback.tsx")),
      false,
      "src/routes/auth/sso-callback.tsx read tokens out of the URL fragment and must not return",
    );
  });

  test("no source file references the relay helpers", () => {
    const banned = ["propagateSSOSession", "checkHubForSession", "redirectToHubSSO", "sso-propagate"];
    for (const file of FILES) {
      const body = readFileSync(file, "utf-8");
      for (const name of banned) {
        assert.equal(
          body.includes(name),
          false,
          `${file.slice(ROOT.length + 1)} references ${name}; the cross-origin session relay must stay removed`,
        );
      }
    }
  });

  test("no source file writes auth tokens into a URL", () => {
    for (const file of FILES) {
      const body = readFileSync(file, "utf-8");
      const writesTokenToUrl =
        /access_token\s*:/.test(body) &&
        /(URLSearchParams|\.hash\s*=|searchParams\.set|\.search\s*=)/.test(body);
      assert.equal(
        writesTokenToUrl,
        false,
        `${file.slice(ROOT.length + 1)} appears to place an access token into a URL; tokens must never travel in a URL`,
      );
    }
  });

  test("no source file loads another product origin in an iframe", () => {
    for (const file of FILES) {
      const body = readFileSync(file, "utf-8");
      const framesForeignOrigin =
        /createElement\(["']iframe["']\)/.test(body) && /https:\/\/[a-z0-9-]+\.pages\.dev/.test(body);
      assert.equal(
        framesForeignOrigin,
        false,
        `${file.slice(ROOT.length + 1)} frames another product origin; silent cross-origin session syncing must stay removed`,
      );
    }
  });
});
