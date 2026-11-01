import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { noticeResponseApprovalReviewIdentity } from "../shared/approval-review-identity";

const recipient = {
  name: "Internal Revenue Service",
  line1: "100 Synthetic Notice Response Way",
  line2: null,
  city: "Fresno",
  state: "CA",
  postal: "93725",
};

const reviewed = {
  packet: {
    packetSha256: "a".repeat(64),
    quote: { totalCents: 1099 },
  },
  recipient,
  mailClass: "certified" as const,
  analysis: { documentId: "notice-1", version: 1, result: { issuer: "IRS", deadline: "printed-date-A" } },
};

describe("Notice Respond exact-mailing approval confirmation identity", () => {
  it("keeps confirmation state only for the identical reviewed packet, quote and recipient", () => {
    const original = noticeResponseApprovalReviewIdentity(reviewed);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      packet: { ...reviewed.packet, quote: { ...reviewed.packet.quote } },
      recipient: { ...recipient },
    })).toBe(original);

    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      packet: { ...reviewed.packet, packetSha256: "b".repeat(64) },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      packet: { ...reviewed.packet, quote: { totalCents: 1199 } },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      recipient: { ...recipient, line1: "999 Different IRS Office" },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      mailClass: "standard",
    })).not.toBe(original);
  });

  it("invalidates checked confirmations when controlling notice facts change without a packet change", () => {
    const original = noticeResponseApprovalReviewIdentity(reviewed);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      analysis: { ...reviewed.analysis, version: 2 },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      analysis: { ...reviewed.analysis, result: { ...reviewed.analysis.result, deadline: "printed-date-B" } },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      analysis: { ...reviewed.analysis, documentId: "replacement-notice" },
    })).not.toBe(original);
    expect(noticeResponseApprovalReviewIdentity({
      ...reviewed,
      analysis: { ...reviewed.analysis, result: { ...reviewed.analysis.result } },
    })).toBe(original);
  });

  it("discards the previous packet and approval when the controlling notice is reanalyzed", () => {
    const source = readFileSync(
      new URL("../shared/NoticeResponseWorkflow.tsx", import.meta.url), "utf8",
    );
    const analyze = source.split("async function analyzeSource(): Promise<void> {")[1]
      ?.split("async function saveFacts(): Promise<void> {")[0];
    expect(analyze).toBeTruthy();
    expect(analyze).toContain("setPacket(null)");
    expect(analyze).toContain('setApprovalId("")');
    expect(analyze).toContain("setDraftSaved(false)");
  });

  it("keys the mounted ApprovalChecklist to the reviewed mailing identity", () => {
    const source = readFileSync(
      new URL("../shared/NoticeResponseWorkflow.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "key={noticeResponseApprovalReviewIdentity({ packet, recipient, mailClass, analysis })}",
    );
    // This guards against preserving checked boxes across a second preview
    // while the existing ApprovalChecklist component remains mounted.
  });
});
