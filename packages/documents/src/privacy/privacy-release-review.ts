export type SensitiveDataKind =
  | "social_security_number"
  | "tax_id"
  | "bank_account"
  | "routing_number"
  | "payment_card"
  | "date_of_birth"
  | "medical"
  | "minor"
  | "email"
  | "phone"
  | "address"
  | "signature"
  | "other";

export type SensitiveFindingLocation =
  | {
      type: "text_range";
      start: number;
      end: number;
    }
  | {
      type: "pdf_rect";
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };

export type SensitiveFinding = {
  id: string;
  kind: SensitiveDataKind;
  confidence: number;
  excerpt?: string;
  location?: SensitiveFindingLocation;
  detector?: string;
};

export type PrivacyDecisionAction = "retain" | "redact" | "exclude_document";

export type PrivacyDecision = {
  findingId: string;
  action: PrivacyDecisionAction;
  reason?: string;
};

export type PrivacyReleaseReview = {
  documentId: string;
  documentSha256: string;
  findings: readonly SensitiveFinding[];
  decisions: readonly PrivacyDecision[];
  reviewerId: string;
  reviewedAt: string;
};

function assertSha256(value: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Privacy review requires the exact document SHA-256.");
}

function assertLocation(location: SensitiveFindingLocation): void {
  if (location.type === "text_range") {
    if (!Number.isInteger(location.start) || !Number.isInteger(location.end) || location.start < 0 || location.end <= location.start) {
      throw new Error("Sensitive text ranges require non-negative integer offsets with end > start.");
    }
    return;
  }
  if (
    !Number.isInteger(location.page) ||
    location.page < 1 ||
    ![location.x, location.y, location.width, location.height].every(Number.isFinite) ||
    location.width <= 0 ||
    location.height <= 0
  ) {
    throw new Error("PDF redaction rectangles require page >= 1 and finite positive dimensions.");
  }
}

export function createPrivacyReleaseReview(input: PrivacyReleaseReview): PrivacyReleaseReview {
  if (!input.documentId.trim()) throw new Error("Privacy review requires documentId.");
  assertSha256(input.documentSha256);
  if (!input.reviewerId.trim()) throw new Error("Privacy review requires reviewerId.");
  if (!Number.isFinite(Date.parse(input.reviewedAt))) throw new Error("Privacy review requires a valid reviewedAt date.");

  const findingIds = new Set<string>();
  for (const finding of input.findings) {
    if (!finding.id.trim()) throw new Error("Sensitive findings require stable ids.");
    if (findingIds.has(finding.id)) throw new Error(`Duplicate sensitive finding id: ${finding.id}`);
    findingIds.add(finding.id);
    if (!Number.isFinite(finding.confidence) || finding.confidence < 0 || finding.confidence > 1) {
      throw new Error(`Sensitive finding ${finding.id} confidence must be between 0 and 1.`);
    }
    if (finding.location) assertLocation(finding.location);
  }

  const decisions = new Map<string, PrivacyDecision>();
  for (const decision of input.decisions) {
    if (!findingIds.has(decision.findingId)) {
      throw new Error(`Privacy decision references unknown finding: ${decision.findingId}`);
    }
    if (decisions.has(decision.findingId)) {
      throw new Error(`Duplicate privacy decision for finding: ${decision.findingId}`);
    }
    decisions.set(decision.findingId, decision);

    if (decision.action === "redact") {
      const finding = input.findings.find((candidate) => candidate.id === decision.findingId)!;
      if (!finding.location) {
        throw new Error(`Finding ${finding.id} cannot be programmatically redacted without a location.`);
      }
    }
  }

  return Object.freeze({
    ...input,
    findings: Object.freeze(input.findings.map((finding) => Object.freeze({ ...finding }))),
    decisions: Object.freeze(input.decisions.map((decision) => Object.freeze({ ...decision }))),
  });
}

export function unresolvedPrivacyFindings(review: PrivacyReleaseReview): SensitiveFinding[] {
  const decided = new Set(review.decisions.map((decision) => decision.findingId));
  return review.findings.filter((finding) => !decided.has(finding.id));
}

export function privacyReleaseStatus(
  review: PrivacyReleaseReview,
): "approved" | "redaction_required" | "excluded" | "blocked" {
  if (unresolvedPrivacyFindings(review).length) return "blocked";
  if (review.decisions.some((decision) => decision.action === "exclude_document")) return "excluded";
  if (review.decisions.some((decision) => decision.action === "redact")) return "redaction_required";
  return "approved";
}

export type RedactionInstruction = {
  findingId: string;
  kind: SensitiveDataKind;
  location: SensitiveFindingLocation;
};

export function approvedRedactionInstructions(review: PrivacyReleaseReview): RedactionInstruction[] {
  return review.decisions
    .filter((decision) => decision.action === "redact")
    .map((decision) => {
      const finding = review.findings.find((candidate) => candidate.id === decision.findingId);
      if (!finding?.location) throw new Error(`Redaction finding ${decision.findingId} has no location.`);
      return {
        findingId: finding.id,
        kind: finding.kind,
        location: finding.location,
      };
    });
}

export function assertPrivacyReleaseApproved(review: PrivacyReleaseReview): void {
  const status = privacyReleaseStatus(review);
  if (status === "blocked") {
    throw new Error(`Privacy release is blocked by ${unresolvedPrivacyFindings(review).length} unresolved sensitive finding(s).`);
  }
  if (status === "excluded") throw new Error("Document was excluded during privacy review.");
  if (status === "redaction_required") {
    throw new Error("Privacy release requires redaction before the reviewed document may be disclosed.");
  }
}

export type PrivacyRedactionRenderer = {
  render(input: {
    documentId: string;
    sourceSha256: string;
    sourceBytes: Uint8Array;
    instructions: readonly RedactionInstruction[];
  }): Promise<{
    bytes: Uint8Array;
    sha256: string;
  }>;
};

export async function renderApprovedRedactions(input: {
  review: PrivacyReleaseReview;
  sourceBytes: Uint8Array;
  renderer: PrivacyRedactionRenderer;
}): Promise<{ bytes: Uint8Array; sha256: string }> {
  if (privacyReleaseStatus(input.review) !== "redaction_required") {
    throw new Error("Redaction rendering is only allowed for a fully reviewed document with approved redactions.");
  }
  const instructions = approvedRedactionInstructions(input.review);
  const result = await input.renderer.render({
    documentId: input.review.documentId,
    sourceSha256: input.review.documentSha256,
    sourceBytes: input.sourceBytes,
    instructions,
  });
  assertSha256(result.sha256);
  if (result.sha256.toLowerCase() === input.review.documentSha256.toLowerCase()) {
    throw new Error("Redaction renderer returned the original document hash; release remains blocked.");
  }
  return result;
}
