import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecordsRequestDraftPrompt,
  CALIFORNIA_CPRA_PROFILE,
  isCalendarDate,
  RECORDS_REQUEST_LIFECYCLE,
  recordRecordsRequestSent,
  recordRecordsRequestSentFromFulfillment,
  recordRecordsResponse,
  recordsRequestDeliveryMethodForMailClass,
  validateRecordsRequestDraft,
} from "../src/domain-packs/records-request/index.js";

test("records request lifecycle preserves review and approval before send", () => {
  const send = RECORDS_REQUEST_LIFECYCLE.find((stage) => stage.id === "send");
  const approve = RECORDS_REQUEST_LIFECYCLE.find((stage) => stage.id === "approve");

  assert.deepEqual(send?.dependsOn, ["approve"]);
  assert.equal(send?.requiresHumanApproval, true);
  assert.deepEqual(approve?.dependsOn, ["review"]);
});

test("records request prompt is grounded and supports a jurisdiction profile", () => {
  const prompt = buildRecordsRequestDraftPrompt({
    recordsSought: "Inspection reports and correspondence for case CE-123",
    agency: "Example County",
    caseReference: "CE-123",
    authority: CALIFORNIA_CPRA_PROFILE,
  });

  assert.match(prompt, /Inspection reports and correspondence for case CE-123/);
  assert.match(prompt, /California Public Records Act/);
  assert.match(prompt, /Never invent a case number, date, address, agency, statute, or prior request/);
});

test("records request draft validation rejects unresolved placeholders", () => {
  const result = validateRecordsRequestDraft({
    subject: "Records request",
    body: "Please provide the records for [insert case number].",
    openQuestions: [],
  });

  assert.equal(result.passed, false);
  assert.ok(result.errors.some((error) => error.includes("unresolved placeholders")));
});

test("actual send tracking accepts real dates and rejects impossible dates", () => {
  assert.equal(isCalendarDate("2026-09-17"), true);
  assert.equal(isCalendarDate("2026-02-31"), false);

  const sent = recordRecordsRequestSent({
    sentDate: "2026-09-17",
    method: "certified_mail",
    trackingNumber: "TRACK-123",
  });
  assert.equal(sent.ok, true);
  assert.equal(sent.event?.type, "records_request_sent");
  assert.equal(sent.event?.occurredOn, "2026-09-17");

  const invalid = recordRecordsRequestSent({
    sentDate: "2026-02-31",
    method: "email",
  });
  assert.equal(invalid.ok, false);
});

test("canonical mailing classes map exactly into records-request delivery methods", () => {
  assert.equal(recordsRequestDeliveryMethodForMailClass("standard"), "first_class_mail");
  assert.equal(recordsRequestDeliveryMethodForMailClass("certified"), "certified_mail");
  assert.equal(recordsRequestDeliveryMethodForMailClass("registered"), "registered_mail");
});

test("submission and processing do not start records-request response tracking", () => {
  for (const status of ["submitted", "provider_processing"] as const) {
    const result = recordRecordsRequestSentFromFulfillment({
      mailingClass: "certified",
      event: {
        providerOrderId: "letter_123",
        status,
        occurredAt: "2026-09-17T20:00:00.000Z",
        trackingNumber: "TRACK-123",
      },
    });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /provider-confirmed actual send timestamp/i);
  }
});

test("provider-confirmed actual send creates records_request_sent", () => {
  const result = recordRecordsRequestSentFromFulfillment({
    mailingClass: "registered",
    event: {
      providerOrderId: "letter_123",
      providerEventId: "evt_mailed_123",
      status: "mailed",
      occurredAt: "2026-09-18T01:00:00.000Z",
      actualSentAt: "2026-09-17T23:45:00.000Z",
      trackingNumber: "TRACK-123",
      proofArtifactId: "receipt-123",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.event?.type, "records_request_sent");
  assert.equal(result.event?.occurredOn, "2026-09-17");
  assert.equal(result.event?.data.method, "registered_mail");
  assert.equal(result.event?.data.providerId, "letter_123");
  assert.equal(result.event?.data.trackingNumber, "TRACK-123");
  assert.equal(result.event?.data.receiptArtifactId, "receipt-123");
});

test("response tracking records both response and confirmed non-response", () => {
  const received = recordRecordsResponse({
    responded: true,
    responseDate: "2026-09-20",
    responseArtifactIds: ["artifact-1"],
  });
  assert.equal(received.ok, true);
  assert.equal(received.event?.type, "records_response_received");

  const missingObservationDate = recordRecordsResponse({ responded: false });
  assert.equal(missingObservationDate.ok, false);

  const noResponse = recordRecordsResponse({
    responded: false,
    observationDate: "2026-10-01",
  });
  assert.equal(noResponse.ok, true);
  assert.equal(noResponse.event?.type, "records_response_not_received");
});
