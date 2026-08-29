import test from "node:test";
import assert from "node:assert/strict";
import { COURT_RULING_AUTHORITY_RULES, COURT_RULING_AUTHORITY_SOURCES, COURT_RULING_PRICING } from "../src/domain/court-ruling-gold";
import { ADMINISTRATIVE_DECISION_APPEAL_GOLD } from "../src/domain/administrative-decision-appeal-gold";
import { mapMailMyPDFStatus } from "../src/platform/mailmypdf-provider";

test("Phase F: representative Gold contracts expose authority, pricing, and safety rules", () => {
  assert.ok(COURT_RULING_AUTHORITY_SOURCES.length >= 3);
  assert.ok(COURT_RULING_AUTHORITY_RULES.length >= 3);
  assert.equal(COURT_RULING_PRICING.preparationFee, 29.99);
  assert.equal(COURT_RULING_PRICING.includedResponsePages, 4);
  assert.equal(COURT_RULING_PRICING.largePacketThresholdSheets, 7);
  assert.ok(ADMINISTRATIVE_DECISION_APPEAL_GOLD.capabilities.includes("validation"));
  assert.ok(ADMINISTRATIVE_DECISION_APPEAL_GOLD.capabilities.includes("proof"));
  assert.ok(ADMINISTRATIVE_DECISION_APPEAL_GOLD.authorityRules.length >= 3);
});

test("Phase F: provider status mapping is fail-closed and preserves fulfillment lifecycle", () => {
  assert.equal(mapMailMyPDFStatus("created"), "submitted");
  assert.equal(mapMailMyPDFStatus("submitted"), "submitted");
  assert.equal(mapMailMyPDFStatus("mailed"), "mailed");
  assert.equal(mapMailMyPDFStatus("in_transit"), "in_transit");
  assert.equal(mapMailMyPDFStatus("delivered"), "delivered");
  assert.equal(mapMailMyPDFStatus("failed"), "failed");
  assert.equal(mapMailMyPDFStatus("cancelled"), "cancelled");
  assert.throws(() => mapMailMyPDFStatus("unknown-provider-state"), /unknown communication status/);
});

test("Phase F: provider lifecycle cannot manufacture an order id from an invalid status", () => {
  assert.throws(() => mapMailMyPDFStatus(undefined), /unknown communication status/);
  assert.throws(() => mapMailMyPDFStatus(null), /unknown communication status/);
});
