import { test } from "node:test";
import assert from "node:assert/strict";
import { requireProofWindowRows } from "../src/lib/proof-of-service/proof-window-query.ts";

test("empty successful expiry scan remains successful", () => {
  assert.deepEqual(requireProofWindowRows({ data: [], error: null }), []);
});

test("successful expiry scan retains matching communications", () => {
  const rows = [{ id: "proof-1" }];
  assert.strictEqual(requireProofWindowRows({ data: rows, error: null }), rows);
});

test("database failure cannot silently become a zero-work successful scan", () => {
  assert.throws(
    () => requireProofWindowRows({ data: null, error: { message: "database unavailable" } }),
    /Expired proof communications query failed: database unavailable/,
  );
});

test("unexpected null data without an error also fails closed", () => {
  assert.throws(
    () => requireProofWindowRows({ data: null, error: null }),
    /returned no rows array/,
  );
});
