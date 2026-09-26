import type { FilingSubmission, FilingSubmissionEvent, FilingSubmissionRequest } from "./types.js";

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} requires a SHA-256 hex hash.`);
}

export function createFilingSubmission(request: FilingSubmissionRequest): Omit<FilingSubmission, "id"> {
  if (!request.matterId.trim()) throw new Error("Filing submission requires matterId.");
  if (!request.packetId.trim()) throw new Error("Filing submission requires packetId.");
  assertSha256(request.packetSha256, "Filing submission");
  if (!request.jurisdiction.name.trim() || !request.jurisdiction.region.trim()) {
    throw new Error("Filing submission requires a named jurisdiction and region.");
  }
  if (request.jurisdiction.kind === "court" && !request.jurisdiction.caseNumber?.trim()) {
    throw new Error("A court filing requires a caseNumber.");
  }

  return Object.freeze({
    matterId: request.matterId,
    packetId: request.packetId,
    packetSha256: request.packetSha256,
    jurisdiction: Object.freeze({ ...request.jurisdiction }),
    status: "pending",
    events: Object.freeze([]),
    createdAt: request.now,
  });
}

/**
 * Every terminal outcome (accepted/rejected/voided) is final for this
 * submission — a rejection is corrected by creating a new submission, not by
 * mutating this one, so the record of what was actually filed and what
 * happened to it stays exact.
 */
export function applyFilingEvent(submission: FilingSubmission, event: FilingSubmissionEvent): FilingSubmission {
  if (submission.status !== "pending" && submission.status !== "submitted") {
    throw new Error(`Cannot apply an event to a ${submission.status} filing submission.`);
  }

  const events = Object.freeze([...submission.events, Object.freeze({ ...event })]);

  switch (event.type) {
    case "submitted":
      if (submission.status !== "pending") throw new Error("Only a pending submission can be marked submitted.");
      return Object.freeze({ ...submission, status: "submitted", events, providerReference: event.providerReference });
    case "accepted":
      if (submission.status !== "submitted") throw new Error("Only a submitted filing can be accepted.");
      return Object.freeze({ ...submission, status: "accepted", events, confirmationNumber: event.confirmationNumber });
    case "rejected":
      if (submission.status !== "submitted") throw new Error("Only a submitted filing can be rejected.");
      return Object.freeze({ ...submission, status: "rejected", events });
    case "voided":
      return Object.freeze({ ...submission, status: "voided", events });
  }
}

export function isFilingAccepted(submission: FilingSubmission): boolean {
  return submission.status === "accepted" && submission.confirmationNumber !== undefined;
}

export function assertFilingAccepted(submission: FilingSubmission): void {
  if (!isFilingAccepted(submission)) {
    throw new Error(`Filing submission is ${submission.status}, not accepted.`);
  }
}
