import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_DEFENSE_CASE, buildDefenseIssues, buildDefensePacket, packetReadiness, validateStep } from "../src/index.js";

const complete = {
  ...EMPTY_DEFENSE_CASE,
  defendantName: "Example Defendant",
  county: "Humboldt",
  arrestDate: "2026-09-01",
  chargedOffenses: "Vehicle Code allegation; HSC 11364 allegation",
  stopReason: "Plate inquiry",
  arrestedAt: "21:14",
  searchedAt: "21:16",
  vehicleVin: "1ABC123",
  billOfSaleVin: "1ABC123",
  reportVin: "1ABD123",
  purchaseDate: "2026-08-15",
  sellerName: "Example Seller",
  officerReasonGiven: "Dispatch reported a stolen vehicle hit",
  searchType: "Search incident to arrest",
  itemLocation: "Front pants pocket",
  itemDescription: "Glass pipe alleged to be drug paraphernalia",
  paymentTrace: "yes" as const,
  evidence: ["Original bill of sale", "Seller text messages", "Payment record", "Body-camera video"],
};

test("blocks purchase step until bill of sale is marked preserved", () => {
  const errors = validateStep("purchase", { ...complete, evidence: complete.evidence.filter((item) => item !== "Original bill of sale") });
  assert.match(errors.join(" "), /bill of sale/i);
});

test("flags conflicting vehicle identifiers", () => {
  const issue = buildDefenseIssues(complete).find((candidate) => candidate.id === "identifier-conflict");
  assert.equal(issue?.status, "conflict");
});

test("warns when a non-California jurisdiction uses the California authority pack", () => {
  const issue = buildDefenseIssues({ ...complete, state: "Oregon" }).find((candidate) => candidate.id === "jurisdiction");
  assert.equal(issue?.status, "urgent");
});

test("packet preserves issue framing without promising suppression", () => {
  const packet = buildDefensePacket(complete);
  assert.match(packet, /attorney review/i);
  assert.match(packet, /Penal Code §1538\.5/);
  assert.doesNotMatch(packet.toLowerCase(), /will be suppressed|guaranteed suppression/);
});

test("readiness is deterministic and bounded", () => {
  const readiness = packetReadiness(complete);
  assert.ok(readiness.score >= 0 && readiness.score <= 100);
  assert.deepEqual(readiness, packetReadiness(complete));
});
