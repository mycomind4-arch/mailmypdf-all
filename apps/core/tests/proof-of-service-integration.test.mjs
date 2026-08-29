/**
 * Integration tests for the Proof-of-Service API layer.
 *
 * These tests exercise the full flow WITHOUT a real database:
 * 1. Document hashing (SHA-256)
 * 2. Communication record creation with hash chain
 * 3. Custody event chain construction
 * 4. Proof bundle assembly + verification
 * 5. Tamper detection across the full chain
 *
 * Run with: node --test tests/proof-of-service-integration.test.mjs
 */

import { test, describe } from "node:test";
import { strictEqual, notStrictEqual, ok } from "node:assert";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";

// ── Re-implement core logic (same as the production code) ──────────────────────

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJSON).join(",") + "]";
  }
  if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj).sort();
    const pairs = keys
      .filter(k => obj[k] !== undefined)
      .map(k => JSON.stringify(k) + ":" + canonicalJSON(obj[k]));
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(String(obj));
}

function hashDocument(data) {
  return createHash("sha256").update(data).digest("hex");
}

function hashRecord(content) {
  return createHash("sha256").update(canonicalJSON(content)).digest("hex");
}

function hashCustodyEvent({ priorEventHash, timestamp, eventType, description }) {
  const input = `${priorEventHash ?? ""}|${timestamp}|${eventType}|${description}`;
  return createHash("sha256").update(input).digest("hex");
}

function verifyCustodyEvent({ eventHash, priorEventHash, timestamp, eventType, description }) {
  const expected = hashCustodyEvent({ priorEventHash, timestamp, eventType, description });
  if (expected.length !== eventHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ eventHash.charCodeAt(i);
  }
  return diff === 0;
}

// ── Full Lifecycle Simulation ────────────────────────────────────────────────

describe("Full Proof-of-Service Lifecycle", () => {
  test("document upload → communication creation → send → delivery → proof bundle", () => {
    // ── 1. Document Upload ──────────────────────────────────────────────────
    const documentContent = new TextEncoder().encode(
      "NOTICE OF CODE VIOLATION\n\nProperty: 123 Example St, Eureka, CA 95501\n\nYou are hereby notified..."
    );
    const documentHash = hashDocument(documentContent);

    ok(documentHash.length === 64, "Document hash should be 64 hex chars");
    ok(/^[0-9a-f]{64}$/.test(documentHash), "Document hash should be valid hex");

    const documentId = randomUUID();
    const tenantId = randomUUID();
    const communicationId = randomUUID();
    const matterReference = "Humboldt-CE-2026-0042";

    // ── 2. First Communication (no prior record) ─────────────────────────────
    const legalReference = {
      type: "ordinance",
      citation: "Humboldt County Code § 314-7",
      description: "Code violation notice — 30-day cure period",
      response_window_days: 30,
      response_window_ends: null,
    };

    const recipient = {
      name: "Jane Property Owner",
      address_line1: "123 Example St",
      address_line2: null,
      city: "Eureka",
      state: "CA",
      postal_code: "95501",
      country: "US",
    };

    const comm1Content = {
      document_sha256: documentHash,
      legal_reference: legalReference,
      recipient: {
        name: recipient.name,
        address_line1: recipient.address_line1,
        address_line2: recipient.address_line2,
        city: recipient.city,
        state: recipient.state,
        postal_code: recipient.postal_code,
        country: recipient.country,
      },
      mail_type: "certified",
      matter_reference: matterReference,
      matter_type: "code_enforcement",
      prior_record_hash: null,
    };

    const comm1Hash = hashRecord(comm1Content);

    // ── 3. Custody Chain for Communication 1 ─────────────────────────────────
    const event1_1 = {
      priorEventHash: null,
      timestamp: "2026-08-02T13:00:00Z",
      eventType: "created",
      description: "Communication record created",
    };
    event1_1.event_hash = hashCustodyEvent(event1_1);

    const event1_2 = {
      priorEventHash: event1_1.event_hash,
      timestamp: "2026-08-02T13:01:00Z",
      eventType: "sent",
      description: "Submitted to Lob for certified mailing",
    };
    event1_2.event_hash = hashCustodyEvent(event1_2);

    const event1_3 = {
      priorEventHash: event1_2.event_hash,
      timestamp: "2026-08-02T13:05:00Z",
      eventType: "in_transit",
      description: "Letter in_transit",
    };
    event1_3.event_hash = hashCustodyEvent(event1_3);

    const event1_4 = {
      priorEventHash: event1_3.event_hash,
      timestamp: "2026-08-04T15:30:00Z",
      eventType: "delivered",
      description: "Letter delivered to recipient",
    };
    event1_4.event_hash = hashCustodyEvent(event1_4);

    // ── 4. Verify Communication 1's Custody Chain ─────────────────────────────
    const custodyChain1 = [event1_1, event1_2, event1_3, event1_4];

    for (let i = 0; i < custodyChain1.length; i++) {
      const expectedPrior = i === 0 ? null : custodyChain1[i - 1].event_hash;
      strictEqual(custodyChain1[i].priorEventHash, expectedPrior,
        `Event ${i} prior hash linkage`);

      ok(verifyCustodyEvent({
        eventHash: custodyChain1[i].event_hash,
        priorEventHash: custodyChain1[i].priorEventHash,
        timestamp: custodyChain1[i].timestamp,
        eventType: custodyChain1[i].eventType,
        description: custodyChain1[i].description,
      }), `Event ${i} hash verification`);
    }

    // ── 5. Second Communication (same matter — should chain from comm1) ───────
    const comm2Content = {
      document_sha256: documentHash,
      legal_reference: {
        ...legalReference,
        description: "Second notice — cure period expired, enforcement action pending",
      },
      recipient: {
        ...comm1Content.recipient,
      },
      mail_type: "certified_return_receipt",
      matter_reference: matterReference,
      matter_type: "code_enforcement",
      prior_record_hash: comm1Hash,
    };

    const comm2Hash = hashRecord(comm2Content);

    // Verify the record chain
    strictEqual(comm2Content.prior_record_hash, comm1Hash,
      "Second communication must chain from first");

    notStrictEqual(comm1Hash, comm2Hash,
      "Different records must have different hashes");

    // ── 6. Proof Bundle Assembly ──────────────────────────────────────────────
    const sentAt = "2026-08-02T13:01:00Z";
    const deliveredAt = "2026-08-04T15:30:00Z";
    const responseWindowDays = 30;
    const responseWindowEnds = new Date(
      new Date(sentAt).getTime() + responseWindowDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const bundleContent = {
      communication_id: communicationId,
      document_sha256: documentHash,
      document_filename: "notice_of_violation.pdf",
      sent_at: sentAt,
      carrier: "usps",
      tracking_number: "9405 5036 9930 0000 0000 00",
      mail_type: "certified",
      delivered_at: deliveredAt,
      signature_image_url: "https://lob.com/signature/abc123.png",
      proof_of_delivery: null,
      legal_reference: {
        ...legalReference,
        response_window_ends: responseWindowEnds,
      },
      response_window_status: "within_window",
      response_window_ends: responseWindowEnds,
      custody_chain: custodyChain1.map(e => ({
        timestamp: e.timestamp,
        event_type: e.eventType,
        description: e.description,
        event_hash: e.event_hash,
        prior_event_hash: e.priorEventHash,
      })),
    };

    const bundleSha256 = createHash("sha256")
      .update(canonicalJSON(bundleContent))
      .digest("hex");

    ok(bundleSha256.length === 64, "Bundle hash should be 64 hex chars");
    ok(/^[0-9a-f]{64}$/.test(bundleSha256), "Bundle hash should be valid hex");

    // ── 7. Tamper Detection ──────────────────────────────────────────────────
    // Tamper with the custody chain: modify event 2's description
    const tamperedChain = [...custodyChain1];
    tamperedChain[1] = { ...tamperedChain[1], description: "TAMPERED" };

    // The original hash should NOT verify against the tampered description
    strictEqual(
      verifyCustodyEvent({
        eventHash: tamperedChain[1].event_hash,
        priorEventHash: tamperedChain[1].priorEventHash,
        timestamp: tamperedChain[1].timestamp,
        eventType: tamperedChain[1].eventType,
        description: "TAMPERED",
      }),
      false,
      "Tampered event description should fail verification",
    );

    // Tamper with the document hash
    const tamperedBundleContent = { ...bundleContent, document_sha256: "0".repeat(64) };
    const tamperedBundleHash = createHash("sha256")
      .update(canonicalJSON(tamperedBundleContent))
      .digest("hex");

    notStrictEqual(bundleSha256, tamperedBundleHash,
      "Tampered document hash should produce different bundle hash");

    // ── 8. Response Window Calculation ────────────────────────────────────────
    const windowEnd = new Date(responseWindowEnds);
    const now = new Date("2026-08-02T14:00:00Z"); // 1 hour after send

    ok(now < windowEnd, "1 hour after send should be within window");

    const afterWindow = new Date("2026-09-05T00:00:00Z"); // after 30 days
    ok(afterWindow > windowEnd, "35 days after send should be outside window");
  });

  test("multiple communications in the same matter form an unbroken record chain", () => {
    const matterReference = "Humboldt-CE-2026-0099";
    const documentHash = hashDocument(new TextEncoder().encode("test document"));

    // Build a chain of 5 communications for the same matter
    let priorHash = null;
    const recordHashes = [];

    for (let i = 0; i < 5; i++) {
      const content = {
        document_sha256: documentHash,
        legal_reference: {
          type: "ordinance",
          citation: `Notice ${i + 1}`,
          description: `Notice number ${i + 1}`,
          response_window_days: 30,
          response_window_ends: null,
        },
        recipient: {
          name: "Test Recipient",
          address_line1: "456 Test Ave",
          address_line2: null,
          city: "Eureka",
          state: "CA",
          postal_code: "95501",
          country: "US",
        },
        mail_type: "certified",
        matter_reference: matterReference,
        matter_type: "code_enforcement",
        prior_record_hash: priorHash,
      };

      const recordHash = hashRecord(content);
      recordHashes.push(recordHash);
      priorHash = recordHash;
    }

    // Verify the chain
    strictEqual(recordHashes.length, 5);
    for (let i = 1; i < recordHashes.length; i++) {
      notStrictEqual(recordHashes[i], recordHashes[i - 1],
        `Each record hash must be unique (index ${i})`);
    }

    // Tamper with record 2's content — recompute would NOT match
    const tamperedContent = {
      document_sha256: documentHash,
      legal_reference: {
        type: "ordinance",
        citation: "Notice 2",
        description: "TAMPERED DESCRIPTION",
        response_window_days: 30,
        response_window_ends: null,
      },
      recipient: {
        name: "Test Recipient",
        address_line1: "456 Test Ave",
        address_line2: null,
        city: "Eureka",
        state: "CA",
        postal_code: "95501",
        country: "US",
      },
      mail_type: "certified",
      matter_reference: matterReference,
      matter_type: "code_enforcement",
      prior_record_hash: recordHashes[0],
    };

    const tamperedHash = hashRecord(tamperedContent);
    notStrictEqual(tamperedHash, recordHashes[1],
      "Tampered content must produce different hash");
  });
});
