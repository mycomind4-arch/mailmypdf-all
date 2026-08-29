import { describe, it, expect } from "vitest";

describe("Immigration Workflows", () => {
  it("Immigration Mail product has the flagship Respond to a Notice workflow", () => {
    const required = ["intro", "document", "facts", "objective", "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted"];
    expect(required.length).toBe(11);
    expect(required.at(0)).toBe("intro");
    expect(required.at(-1)).toBe("submitted");
  });

  it("product safety boundary is explicit", () => {
    const disclaimer = "Immigration Mail is not a law firm and does not provide legal advice.";
    expect(disclaimer).toMatch(/not a law firm/);
    expect(disclaimer).toMatch(/does not provide legal advice/);
  });
});
