import test from "node:test";
import assert from "node:assert/strict";
import { COURT_RULING_AUTHORITY_RULES, COURT_RULING_AUTHORITY_SOURCES, COURT_RULING_PRICING } from "../src/domain/court-ruling-gold";
import { ADMINISTRATIVE_DECISION_APPEAL_GOLD } from "../src/domain/administrative-decision-appeal-gold";
// mapMailMyPDFStatus (src/platform/mailmypdf-provider.ts) was consolidated
// into the canonical @mailmypdf/fulfillment package's
// normalizeMailMyPDFStatus (see BUILD_STATUS.md: "Fulfillment status
// vocabulary — canonical provider-status normalization now lives in
// @mailmypdf/fulfillment") — same input/output mapping, different name.
import { normalizeMailMyPDFStatus as mapMailMyPDFStatus } from "@mailmypdf/fulfillment";

test("Phase F: representative Gold contracts expose authority, pricing, and safety rules", () => {
  assert.ok(COURT_RULING_AUTHORITY_SOURCES.length >= 3);
  assert.ok(COURT_RULING_AUTHORITY_RULES.length >= 3);
  // Derived from the canonical @mailmypdf/pricing profile for
  // "court-ruling" ($69.99 base, 8 included pages); largePacketThresholdSheets
  // is 0 (unused) here as it is for every sibling Gold workflow.
  assert.equal(COURT_RULING_PRICING.preparationFee, 69.99);
  assert.equal(COURT_RULING_PRICING.includedResponsePages, 8);
  assert.equal(COURT_RULING_PRICING.largePacketThresholdSheets, 0);
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
  assert.throws(() => mapMailMyPDFStatus("unknown-provider-state"), /Unknown MailMyPDF fulfillment status/);
});

test("Phase F: provider lifecycle cannot manufacture an order id from an invalid status", () => {
  assert.throws(() => mapMailMyPDFStatus(undefined), /Unknown MailMyPDF fulfillment status/);
  assert.throws(() => mapMailMyPDFStatus(null), /Unknown MailMyPDF fulfillment status/);
});
