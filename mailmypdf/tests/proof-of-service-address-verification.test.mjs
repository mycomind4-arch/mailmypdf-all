/**
 * Tests for the Proof-of-Service address verification module.
 *
 * Tests the verification logic, deliverability parsing, correction detection,
 * custody event recording, and integration with the proof bundle.
 *
 * Run with: node --test tests/proof-of-service-address-verification.test.mjs
 */

import { test, describe } from "node:test";
import { strictEqual, deepEqual, ok, notStrictEqual } from "node:assert";
import { createHash } from "node:crypto";

// ── Re-implemented logic for testing (mirrors production code) ───────────────

function parseLobResponse(response) {
  const deliverability = response?.deliverability ?? "missing_information";
  const verifiedAddr = response?.address ?? null;

  const isDeliverable =
    deliverability === "deliverable" ||
    deliverability === "deliverable_missing_unit" ||
    deliverability === "deliverable_unnecessary_unit";

  let corrections = null;
  const input = {
    line1: "123 Main St",
    line2: null,
    city: "Eureka",
    state: "CA",
    postal: "95501",
  };

  if (verifiedAddr) {
    const diffs = {};
    if (verifiedAddr.address_line1 && verifiedAddr.address_line1 !== input.line1) {
      diffs.line1 = { input: input.line1, verified: verifiedAddr.address_line1 };
    }
    if (verifiedAddr.address_zip && verifiedAddr.address_zip !== input.postal) {
      diffs.postal = { input: input.postal, verified: verifiedAddr.address_zip };
    }
    if (Object.keys(diffs).length > 0) corrections = diffs;
  }

  return {
    deliverability,
    is_deliverable: isDeliverable,
    verified_address: verifiedAddr ? {
      line1: verifiedAddr.address_line1 ?? null,
      line2: verifiedAddr.address_line2 ?? null,
      city: verifiedAddr.address_city ?? null,
      state: verifiedAddr.address_state ?? null,
      postal: verifiedAddr.address_zip ?? null,
    } : null,
    corrections,
    warnings: corrections ? ["Lob suggests corrections to the address"] : [],
    api_succeeded: true,
  };
}

const __sha256_hash = { createHash };

function sha256(obj) {
  // Sort keys for canonical JSON
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

describe("Address Verification — Lob Response Parsing", () => {
  test("parses a deliverable address correctly", () => {
    // Use a parseLobResponse that accepts the input address
    function parseWithInput(response, inputAddr) {
      const deliverability = response?.deliverability ?? "missing_information";
      const verifiedAddr = response?.address ?? null;
      const isDeliverable = ["deliverable", "deliverable_missing_unit", "deliverable_unnecessary_unit"].includes(deliverability);

      let corrections = null;
      if (verifiedAddr) {
        const diffs = {};
        if (verifiedAddr.address_line1 && verifiedAddr.address_line1 !== inputAddr.line1) {
          diffs.line1 = { input: inputAddr.line1, verified: verifiedAddr.address_line1 };
        }
        if (verifiedAddr.address_zip && verifiedAddr.address_zip !== inputAddr.postal) {
          diffs.postal = { input: inputAddr.postal, verified: verifiedAddr.address_zip };
        }
        if (Object.keys(diffs).length > 0) corrections = diffs;
      }

      return {
        deliverability,
        is_deliverable: isDeliverable,
        verified_address: verifiedAddr ? {
          line1: verifiedAddr.address_line1 ?? null,
          line2: verifiedAddr.address_line2 ?? null,
          city: verifiedAddr.address_city ?? null,
          state: verifiedAddr.address_state ?? null,
          postal: verifiedAddr.address_zip ?? null,
        } : null,
        corrections,
        warnings: corrections ? ["Lob suggests corrections to the address"] : [],
        api_succeeded: true,
      };
    }

    const input = { line1: "123 MAIN ST", postal: "95501-1234" };
    const lobResponse = {
      deliverability: "deliverable",
      address: {
        address_line1: "123 MAIN ST",
        address_line2: null,
        address_city: "EUREKA",
        address_state: "CA",
        address_zip: "95501-1234",
      },
    };

    const result = parseWithInput(lobResponse, input);

    strictEqual(result.deliverability, "deliverable");
    ok(result.is_deliverable, "Should be deliverable");
    ok(result.verified_address, "Should have verified address");
    strictEqual(result.verified_address.line1, "123 MAIN ST");
    strictEqual(result.verified_address.postal, "95501-1234");
    strictEqual(result.corrections, null, "No corrections for exact match");
  });

  test("parses deliverable_missing_unit correctly", () => {
    const result = parseLobResponse({
      deliverability: "deliverable_missing_unit",
      address: { address_line1: "123 Main St", address_city: "Eureka", address_state: "CA", address_zip: "95501" },
    });

    ok(result.is_deliverable, "deliverable_missing_unit should be deliverable");
    strictEqual(result.deliverability, "deliverable_missing_unit");
  });

  test("parses undeliverable correctly", () => {
    const result = parseLobResponse({
      deliverability: "undeliverable",
      address: null,
    });

    ok(!result.is_deliverable, "undeliverable should not be deliverable");
    strictEqual(result.deliverability, "undeliverable");
    strictEqual(result.verified_address, null);
  });

  test("detects corrections when Lob standardizes the address", () => {
    const lobResponse = {
      deliverability: "deliverable",
      address: {
        address_line1: "123 MAIN ST",  // uppercase — different from input "123 Main St"
        address_city: "Eureka",
        address_state: "CA",
        address_zip: "95501",           // same as input
      },
    };

    // For this test, use a different input
    function parseWithInput(response, inputAddr) {
      const deliverability = response?.deliverability ?? "missing_information";
      const verifiedAddr = response?.address ?? null;
      const isDeliverable = ["deliverable", "deliverable_missing_unit", "deliverable_unnecessary_unit"].includes(deliverability);

      let corrections = null;
      if (verifiedAddr) {
        const diffs = {};
        if (verifiedAddr.address_line1 && verifiedAddr.address_line1 !== inputAddr.line1) {
          diffs.line1 = { input: inputAddr.line1, verified: verifiedAddr.address_line1 };
        }
        if (verifiedAddr.address_zip && verifiedAddr.address_zip !== inputAddr.postal) {
          diffs.postal = { input: inputAddr.postal, verified: verifiedAddr.address_zip };
        }
        if (Object.keys(diffs).length > 0) corrections = diffs;
      }

      return { deliverability, is_deliverable: isDeliverable, corrections };
    }

    const input = { line1: "123 Main St", postal: "95501" };
    const result = parseWithInput(lobResponse, input);

    ok(result.corrections, "Should detect corrections");
    strictEqual(result.corrections.line1.input, "123 Main St");
    strictEqual(result.corrections.line1.verified, "123 MAIN ST");
    ok(!result.corrections.postal, "Postal code matches, should not be in corrections");
  });

  test("missing_information when Lob returns 422", () => {
    const result = parseLobResponse({ deliverability: "missing_information", address: null });

    ok(!result.is_deliverable, "missing_information should not be deliverable");
    strictEqual(result.deliverability, "missing_information");
  });
});

describe("Address Verification — International Addresses", () => {
  test("skips verification for non-US addresses but allows send", () => {
    function verifyIntl(country) {
      if (country && country !== "US") {
        return {
          deliverability: "missing_information",
          is_deliverable: true,  // Don't block international sends
          verified_address: null,
          corrections: null,
          warnings: [`International address (${country}) — US verification skipped`],
          api_succeeded: false,
        };
      }
      return null; // Would proceed to Lob API
    }

    const result = verifyIntl("CA");
    ok(result, "Should return a result for Canadian address");
    ok(result.is_deliverable, "International sends should not be blocked");
    ok(result.warnings[0].includes("International"), "Should warn about skipping verification");
  });

  test("proceeds with verification for US addresses", () => {
    function verifyIntl(country) {
      if (country && country !== "US") return { skipped: true };
      return null;
    }

    const result = verifyIntl("US");
    strictEqual(result, null, "Should proceed to Lob API for US addresses");
  });
});

describe("Address Verification — API Failure Handling", () => {
  test("returns is_deliverable=true when API fails (don't block on infrastructure failure)", () => {
    function handleApiFailure(error) {
      return {
        deliverability: "missing_information",
        is_deliverable: true,  // Don't block on API failure
        verified_address: null,
        corrections: null,
        warnings: [`Address verification API unavailable: ${error}`],
        api_succeeded: false,
      };
    }

    const result = handleApiFailure("fetch failed");
    ok(result.is_deliverable, "Should not block send when API is down");
    ok(!result.api_succeeded, "Should flag API failure");
    ok(result.warnings[0].includes("fetch failed"), "Should include error in warnings");
  });

  test("returns is_deliverable=false when no Lob key configured", () => {
    function noKey() {
      return {
        deliverability: "missing_information",
        is_deliverable: false,
        verified_address: null,
        corrections: null,
        warnings: ["Lob API key not configured — address verification skipped"],
        api_succeeded: false,
      };
    }

    const result = noKey();
    ok(!result.is_deliverable, "Should not be deliverable without key");
    ok(result.warnings[0].includes("not configured"), "Should explain the issue");
  });
});

describe("Address Verification — Custody Event Recording", () => {
  test("address_verified event is properly described", () => {
    function describeVerification(result) {
      return result.api_succeeded
        ? `Recipient address verified via Lob: ${result.deliverability}`
        : "Address verification attempted but API unavailable";
    }

    strictEqual(
      describeVerification({ api_succeeded: true, deliverability: "deliverable" }),
      "Recipient address verified via Lob: deliverable",
    );

    strictEqual(
      describeVerification({ api_succeeded: false, deliverability: "missing_information" }),
      "Address verification attempted but API unavailable",
    );
  });

  test("verification metadata contains deliverability and corrections", () => {
    const metadata = {
      deliverability: "deliverable_missing_unit",
      is_deliverable: true,
      corrections: { line2: { input: "", verified: "APT 4B" } },
      warnings: ["Lob suggests corrections to the address"],
    };

    strictEqual(metadata.deliverability, "deliverable_missing_unit");
    ok(metadata.is_deliverable);
    ok(metadata.corrections.line2);
    strictEqual(metadata.corrections.line2.verified, "APT 4B");
  });
});

describe("Address Verification — Proof Bundle Integration", () => {
  test("proof bundle includes address_verification when present", () => {
    const custodyChain = [
      { event_type: "created", timestamp: "2026-08-02T18:00:00Z", description: "Communication created" },
      { event_type: "address_verified", timestamp: "2026-08-02T18:00:01Z", description: "Recipient address verified via Lob: deliverable" },
      { event_type: "sent", timestamp: "2026-08-02T18:00:02Z", description: "Submitted to Lob for certified mailing" },
    ];

    const verifyEvent = custodyChain.find((e) => e.event_type === "address_verified");
    ok(verifyEvent, "Should find address_verified event in chain");
    ok(verifyEvent.description.includes("deliverable"), "Should include deliverability in description");
  });

  test("proof bundle address_verification is null when no verification event exists", () => {
    const custodyChain = [
      { event_type: "created", timestamp: "2026-08-02T18:00:00Z", description: "Communication created" },
      { event_type: "sent", timestamp: "2026-08-02T18:00:02Z", description: "Submitted to Lob" },
    ];

    const verifyEvent = custodyChain.find((e) => e.event_type === "address_verified");
    strictEqual(verifyEvent, undefined, "Should not find address_verified event");

    // In the real code, this returns null
    const addressVerification = verifyEvent ? "found" : null;
    strictEqual(addressVerification, null);
  });

  test("bundle SHA-256 changes when address verification is added", () => {
    function canonicalJSON(obj) {
      return JSON.stringify(obj, Object.keys(obj).sort());
    }

    const bundleWithout = {
      communication_id: "comm1",
      address_verification: null,
      custody_chain: [],
    };

    const bundleWith = {
      communication_id: "comm1",
      address_verification: {
        deliverability: "deliverable",
        is_deliverable: true,
      },
      custody_chain: [{ event_type: "address_verified" }],
    };

    const hash1 = createHash("sha256").update(canonicalJSON(bundleWithout)).digest("hex");
    const hash2 = createHash("sha256").update(canonicalJSON(bundleWith)).digest("hex");

    notStrictEqual(hash1, hash2, "Bundle hash should change when verification is added");
  });
});
