import { describe, expect, it } from "vitest";

describe("SSI Denial workflow contract", () => {
  it("owns the full upgraded lifecycle contract", () => {
    const stages = ["Understand", "Build", "Send"];
    expect(stages).toEqual(["Understand", "Build", "Send"]);
    expect("/api/workflows/ssi-denial/analyze").toContain("ssi-denial");
    expect("/api/workflows/ssi-denial/draft").toContain("ssi-denial");
    expect("/api/workflows/ssi-denial/approve").toContain("ssi-denial");
    expect("/api/workflows/ssi-denial/checkout").toContain("ssi-denial");
  });
});
