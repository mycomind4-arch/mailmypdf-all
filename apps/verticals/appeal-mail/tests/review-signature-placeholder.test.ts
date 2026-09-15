import { describe, it, expect } from "vitest";
import { runReadinessReview } from "@/domain/review";
import { createDecision } from "@/domain/decision";

/**
 * Regression test for a real, confirmed defect found while building a
 * second workflow acceptance test: ~24 of appeal-mail's workflow draft.ts
 * routes (claim-denial-letter, court-ruling, unemployment-denial, ssi-denial,
 * sap-appeal, and others -- see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md
 * and context/FACTORY_STATUS.md) persist a literal, unresolved
 * "[Your Name]" placeholder as the appeal's signature, and every approve.ts
 * computes `hasSignature` with `/\[your name\]/i.test(draft)` -- meaning the
 * readiness review previously reported "pass" for a signature that was
 * never actually filled in, and nothing blocked a customer from approving
 * (and mailing) a letter that still says "[Your Name]" where their
 * signature should be.
 *
 * runReadinessReview() is the one shared function every workflow's
 * approve.ts calls, so it is the correct single point to catch this
 * regardless of what the ~80 individual call sites pass as `hasSignature`.
 */

function baseParams(draft: string) {
  return {
    decision: createDecision("claim_denial", {}),
    grounds: [],
    evidence: [],
    draft,
    recipient: { name: "Recipient", address1: "1 Main St", city: "Columbus", state: "OH", zip: "43215" },
    exhibitCount: 0,
    hasSignature: true,
  };
}

describe("runReadinessReview — signature placeholder", () => {
  it("does not pass missing_signature when the draft still contains the unresolved [Your Name] placeholder, even if hasSignature is reported true", () => {
    const review = runReadinessReview(baseParams("Dear Sir or Madam,\n\nRe: Appeal.\n\nSincerely,\n[Your Name]"));
    const check = review.checks.find((c) => c.id === "missing_signature");
    expect(check?.status).toBe("warning");
    expect(check?.detail).toMatch(/\[Your Name\]/i);
  });

  it("passes missing_signature when the draft ends with an actual signature and no placeholder remains", () => {
    const review = runReadinessReview(baseParams("Dear Sir or Madam,\n\nRe: Appeal.\n\nSincerely,\n\nJordan A. Rivera"));
    const check = review.checks.find((c) => c.id === "missing_signature");
    expect(check?.status).toBe("pass");
  });

  it("still warns when hasSignature is false, regardless of placeholder presence", () => {
    const review = runReadinessReview({ ...baseParams("Dear Sir or Madam,\n\nRe: Appeal."), hasSignature: false });
    const check = review.checks.find((c) => c.id === "missing_signature");
    expect(check?.status).toBe("warning");
    expect(check?.detail).toBe("Add a signature line to the draft.");
  });
});
