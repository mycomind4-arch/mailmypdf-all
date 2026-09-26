import { applyFilingEvent, createFilingSubmission } from "./submission.js";
import type { FilingSubmission, FilingSubmissionRequest } from "./types.js";

export interface FilingProvider {
  readonly name: string;
  submit(request: FilingSubmissionRequest): Promise<FilingSubmission>;
  getSubmission(submissionId: string): Promise<FilingSubmission | null>;
  voidSubmission(submissionId: string, reason: string, now: string): Promise<FilingSubmission>;
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

/**
 * Reference/test-only provider: creates the submission record but never
 * actually transmits it anywhere. Production use requires a real electronic
 * filing service provider (EFSP) adapter (e.g. Tyler Technologies Odyssey
 * File & Serve for courts, or a state Secretary of State / Wolters Kluwer
 * Lien Solutions adapter for UCC filings) implementing FilingProvider — see
 * README.md. This in-memory provider does not itself call `submitted` —
 * call `simulateSubmitted` to model the provider accepting the transmission
 * before a court/agency decision is known.
 */
export class InMemoryFilingProvider implements FilingProvider {
  readonly name = "in-memory-test-provider";
  private readonly submissions = new Map<string, FilingSubmission>();

  async submit(request: FilingSubmissionRequest): Promise<FilingSubmission> {
    const draft = createFilingSubmission(request);
    const submission: FilingSubmission = Object.freeze({ id: nextId("filing"), ...draft });
    this.submissions.set(submission.id, submission);
    return submission;
  }

  async getSubmission(submissionId: string): Promise<FilingSubmission | null> {
    return this.submissions.get(submissionId) ?? null;
  }

  async voidSubmission(submissionId: string, reason: string, now: string): Promise<FilingSubmission> {
    const updated = applyFilingEvent(this.require(submissionId), { type: "voided", at: now, reason });
    this.submissions.set(submissionId, updated);
    return updated;
  }

  /** Test-only hook standing in for the provider acknowledging transmission. */
  async simulateSubmitted(submissionId: string, providerReference: string, now: string): Promise<FilingSubmission> {
    const updated = applyFilingEvent(this.require(submissionId), { type: "submitted", at: now, providerReference });
    this.submissions.set(submissionId, updated);
    return updated;
  }

  /** Test-only hook standing in for the court/agency's acceptance callback. */
  async simulateAccepted(submissionId: string, confirmationNumber: string, now: string): Promise<FilingSubmission> {
    const updated = applyFilingEvent(this.require(submissionId), { type: "accepted", at: now, confirmationNumber });
    this.submissions.set(submissionId, updated);
    return updated;
  }

  /** Test-only hook standing in for the court/agency's rejection callback. */
  async simulateRejected(submissionId: string, reasonCode: string, message: string, now: string): Promise<FilingSubmission> {
    const updated = applyFilingEvent(this.require(submissionId), { type: "rejected", at: now, reasonCode, message });
    this.submissions.set(submissionId, updated);
    return updated;
  }

  private require(submissionId: string): FilingSubmission {
    const submission = this.submissions.get(submissionId);
    if (!submission) throw new Error(`Unknown filing submission: ${submissionId}`);
    return submission;
  }
}
