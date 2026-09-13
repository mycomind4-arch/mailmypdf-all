import { describe, expect, it } from "vitest";
import { isLocalDevelopmentHost, normalizeProjectRelativePath } from "./scan-project-files";

describe("normalizeProjectRelativePath", () => {
  it("accepts a nested path inside the registered project", () => {
    expect(normalizeProjectRelativePath("apps/verticals/private-office/src")).toEqual([
      "apps",
      "verticals",
      "private-office",
      "src",
    ]);
  });

  it("rejects paths that could escape the project root", () => {
    expect(() => normalizeProjectRelativePath("../../.ssh")).toThrow("Invalid project path");
  });

  it("only permits unauthenticated scans from localhost during development", () => {
    expect(isLocalDevelopmentHost("127.0.0.1:8080", "development")).toBe(true);
    expect(isLocalDevelopmentHost("studio.example.com", "development")).toBe(false);
    expect(isLocalDevelopmentHost("localhost:8080", "production")).toBe(false);
  });
});
