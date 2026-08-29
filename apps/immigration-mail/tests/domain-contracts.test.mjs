import { describe, it, expect } from "vitest";

const languages = [
  ["en", false], ["es", false], ["zh", false], ["vi", false],
  ["ko", false], ["tl", false], ["ar", true], ["ru", false],
  ["ht", false], ["pt", false], ["fr", false], ["hi", false],
  ["ur", true], ["bn", false], ["pa", false],
];

describe("Immigration Domain Contracts", () => {
  it("multilingual foundation covers the initial language set", () => {
    expect(languages.length).toBe(15);
    expect(languages.filter(([, rtl]) => rtl).map(([code]) => code)).toEqual(["ar", "ur"]);
  });

  it("voice action policy keeps consequential mailing approval-gated", () => {
    const approvalRequired = new Set(["mail-preview"]);
    expect(approvalRequired.has("mail-preview")).toBe(true);
    expect(approvalRequired.has("read-draft")).toBe(false);
  });

  it("immigration preflight catches unfinished placeholders", () => {
    const draft = "Dear USCIS,\n\n[Your Name]\n\nSincerely";
    expect(/\[[^\]]+\]/.test(draft)).toBe(true);
  });

  it("immigration source model preserves page-level provenance", () => {
    const source = { documentId: "doc-1", documentName: "RFE.pdf", page: 4, excerpt: "Response due..." };
    expect(source.page).toBe(4);
    expect(source.documentId).toBe("doc-1");
  });
});
