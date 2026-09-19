import test from "node:test";
import assert from "node:assert/strict";
import { safeAuthDestination } from "../src/lib/auth-navigation.ts";

test("login preserves a workflow deep link including search and fragment", () => {
  const destination = "/workflows/cp2000/start?matterId=abc#evidence";
  assert.equal(safeAuthDestination(destination), destination);
});

test("login rejects external destinations, malformed paths, and auth loops", () => {
  for (const destination of [undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "/%2f%2fevil.example", "/%5cevil.example", "/auth", "/auth/confirm?redirect=/auth", "/a/../auth", "/%61uth", "/%", " /dashboard"]) {
    assert.equal(safeAuthDestination(destination), "/dashboard", String(destination));
  }
});
