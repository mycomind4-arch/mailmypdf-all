import { describe, expect, it } from "vitest";
import { approve, canExecuteMail, reject, type ApprovalRequest } from "./approvalEngine";

const pending: ApprovalRequest = {
  id: "approval-1",
  businessId: "business-1",
  mailJobId: "job-1",
  requiredRole: "approver",
  status: "pending",
  requestedAt: "2026-08-20T10:00:00.000Z",
};

describe("approvalEngine", () => {
  it("only allows mail execution when approval is actually approved", () => {
    expect(canExecuteMail("pending", true)).toBe(false);
    expect(canExecuteMail("rejected", true)).toBe(false);
    expect(canExecuteMail("cancelled", true)).toBe(false);
    expect(canExecuteMail("approved", true)).toBe(true);
    expect(canExecuteMail("pending", false)).toBe(true);
  });

  it("requires an accountable actor and the required role when approving", () => {
    expect(() => approve(pending, "   ", [])).toThrow("approving actor is required");
    expect(() => approve(pending, "user-42", [])).toThrow("lacks required role");
    const result = approve(pending, " user-42 ", ["approver", "owner"]);
    expect(result.status).toBe("approved");
    expect(result.decidedBy).toBe("user-42");
  });

  it("requires an accountable actor and reason when rejecting", () => {
    expect(() => reject(pending, " ", "reason")).toThrow("rejecting actor is required");
    expect(() => reject(pending, "user-42", " ")).toThrow("rejection reason is required");
    const result = reject(pending, " user-42 ", " Not ready ");
    expect(result.status).toBe("rejected");
    expect(result.decidedBy).toBe("user-42");
    expect(result.reason).toBe("Not ready");
  });
});
