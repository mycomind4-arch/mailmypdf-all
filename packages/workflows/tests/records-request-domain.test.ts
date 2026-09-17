import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecordsRequestDraftPrompt,
  CALIFORNIA_CPRA_PROFILE,
  isCalendarDate,
  RECORDS_REQUEST_LIFECYCLE,
  recordRecordsRequestSent,
  recordRecordsResponse,
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
