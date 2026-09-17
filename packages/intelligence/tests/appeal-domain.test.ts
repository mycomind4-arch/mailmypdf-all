import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDocument,
  createAppeal,
  createDecision,
  createEvidence,
  unsupportedGrounds,
  updateAppeal,
} from "../src/appeal/index.js";

describe("Appeal domain pack", () => {
  test("classifies an explanation of benefits as a primary decision", () => {
    const result = classifyDocument(
      "EXPLANATION OF BENEFITS\nYour claim was denied because the requested service is not covered under the plan.",
    );

    assert.equal(result.documentClass, "explanation_of_benefits");
    assert.equal(result.isPrimaryDecision, true);
    assert.ok(result.confidence > 0);
  });

  test("uses configurable classifier hints without depending on the legacy pack registry", () => {
    const result = classifyDocument(
      "Coverage review outcome. This document explains what happens next and how to respond.",
      { classifierHints: ["coverage review outcome"] },
    );

    assert.equal(result.documentClass, "denial_letter");
    assert.equal(result.isPrimaryDecision, true);
    assert.ok(result.matchedPatterns.includes("hint:coverage review outcome"));
  });

  test("treats linked evidence as support for a ground", () => {
    const evidence = createEvidence("document", "Clinical records", {
      groundIds: ["ground-medical-necessity"],
    });

    assert.deepEqual(
      unsupportedGrounds([evidence], ["ground-medical-necessity", "ground-procedure"]),
      ["ground-procedure"],
    );
  });

  test("prevents mailed status without provider-backed proof", () => {
    const decision = createDecision("claim_denial", {
      agency: "Example Insurer",
      reasons: [{ id: "reason-1", text: "Not covered", confidence: 1 }],
    });
    const appeal = createAppeal("insurance-denial", decision);

    assert.throws(
      () => updateAppeal(appeal, { status: "mailed" }),
      /Cannot mark appeal as mailed or delivered/,
    );
  });

  test("allows mailed status when provider order and mailing proof are present", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer" });
    const appeal = createAppeal("insurance-denial", decision);
    const mailed = updateAppeal(appeal, {
      status: "mailed",
      proof: {
        id: "proof-1",
        appealId: appeal.id,
        packetId: "packet-1",
        finalAppealHash: "sha256:appeal",
        attachmentHashes: [],
        recipientName: "Appeals Department",
        recipientAddress1: "1 Main St",
        recipientCity: "Example",
        recipientState: "CA",
        recipientZip: "95501",
        mailingMethod: "certified",
        mailingTimestamp: "2026-09-17T12:00:00.000Z",
        providerOrderId: "provider-order-1",
        status: "mailed",
        createdAt: "2026-09-17T11:59:00.000Z",
      },
    });

    assert.equal(mailed.status, "mailed");
    assert.equal(mailed.proof?.providerOrderId, "provider-order-1");
  });
});
