import { describe, expect, it } from "vitest";
import { runBasicPreflight } from "./preflight";

describe("Immigration preflight consequential gates", () => {
  const recipient = { name: "USCIS", address: "1 Main St" };

  it("blocks drafts missing required facts", () => {
    const result = runBasicPreflight({
      draft: "The response concerns the pending matter.",
      recipient,
      requiredFacts: ["Receipt Number: ABC123"],
    });

    expect(result.ready).toBe(false);
    expect(result.issues.some((issue) => issue.code === "FACT_NOT_FOUND" && issue.severity === "error")).toBe(true);
  });

  it("blocks unresolved placeholders", () => {
    const result = runBasicPreflight({
      draft: "Dear USCIS, Receipt Number: [RECEIPT_NUMBER]",
      recipient,
    });

    expect(result.ready).toBe(false);
    expect(result.issues.some((issue) => issue.code === "PLACEHOLDER_DETECTED" && issue.severity === "error")).toBe(true);
  });

  it("allows a complete draft without blocking issues", () => {
    const result = runBasicPreflight({
      draft: "Dear USCIS, Receipt Number: ABC123. I am responding to the notice and request review of the enclosed response.",
      recipient,
      requiredFacts: ["ABC123"],
    });

    expect(result.ready).toBe(true);
    expect(result.issues.every((issue) => issue.severity !== "error")).toBe(true);
  });
});
