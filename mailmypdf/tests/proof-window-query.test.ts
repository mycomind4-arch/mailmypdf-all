import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireProofWindowRows, UNNOTIFIED_PROOF_WINDOW_FILTER } from "../src/lib/proof-of-service/proof-window-query.ts";

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


test("expiry scan includes missing or false notified flags at the database layer", () => {
  assert.equal(
    UNNOTIFIED_PROOF_WINDOW_FILTER,
    "metadata->>window_expiry_notified.is.null,metadata->>window_expiry_notified.neq.true",
  );
});

test("expiry scan filters notified rows before LIMIT to prevent batch starvation", () => {
  const source = readFileSync(new URL("../src/routes/api/internal/proof-processor.ts", import.meta.url), "utf8");
  const queryStart = source.indexOf('.from("proof_communications")');
  const queryEnd = source.indexOf(".limit(100)", queryStart);
  assert.ok(queryStart >= 0 && queryEnd > queryStart, "expiry query and limit exist");
  const queryBeforeLimit = source.slice(queryStart, queryEnd);
  assert.match(queryBeforeLimit, /\.or\(UNNOTIFIED_PROOF_WINDOW_FILTER\)/);
  assert.match(queryBeforeLimit, /\.lt\("legal_reference->>response_window_ends", now\)/);
});
