import { describe, expect, it, beforeEach } from "vitest";
import {
  NullAuthorityProvider,
  getAuthorityProvider,
  _setAuthorityProvider,
  _resetAuthorityProvider,
  type AuthorityProvider,
  type AuthorityResult,
} from "./authority-provider";

describe("NullAuthorityProvider", () => {
  const provider = new NullAuthorityProvider();

  it("has name 'null'", () => {
    expect(provider.name).toBe("null");
  });

  it("reports researchPerformed as false", async () => {
    const result = await provider.research({
      workflowId: "security-deposit-dispute",
      context: "test context",
    });
    expect(result.researchPerformed).toBe(false);
  });

  it("returns empty citations array", async () => {
    const result = await provider.research({
      workflowId: "test",
      context: "test",
    });
    expect(result.citations).toEqual([]);
  });

  it("returns a disclaimer stating no research was performed", async () => {
    const result = await provider.research({
      workflowId: "test",
      context: "test",
    });
    expect(result.disclaimer).toContain("No external authority research was performed");
  });

  it("returns system_generated provenance, NOT externally_sourced", async () => {
    const result = await provider.research({
      workflowId: "test",
      context: "test",
    });
    expect(result.provenance).toBe("system_generated");
  });

  it("does not fabricate citations regardless of input", async () => {
    const result = await provider.research({
      workflowId: "bank-wire-dispute",
      context: "unauthorized wire transfer, Regulation E",
      jurisdiction: "United States",
    });
    expect(result.citations).toHaveLength(0);
    expect(result.researchPerformed).toBe(false);
  });

  it("does not mention 'research was performed' or 'research completed' in disclaimer", async () => {
    const result = await provider.research({
      workflowId: "test",
      context: "test",
    });
    // The disclaimer must contain the honest negation: "No external authority research"
    expect(result.disclaimer).toContain("No external authority research was performed");
    // It must NOT contain any positive claim of completed research
    expect(result.disclaimer).not.toContain("research completed");
    expect(result.disclaimer).not.toContain("successfully performed");
  });
});

describe("authority provider factory", () => {
  beforeEach(() => {
    _resetAuthorityProvider();
  });

  it("returns NullAuthorityProvider by default", () => {
    const provider = getAuthorityProvider();
    expect(provider.name).toBe("null");
  });

  it("returns injected provider when set", () => {
    const custom: AuthorityProvider = {
      name: "test-provider",
      async research(): Promise<AuthorityResult> {
        return {
          researchPerformed: true,
          citations: [],
          disclaimer: "Test provider",
          provenance: "externally_sourced",
        };
      },
    };
    _setAuthorityProvider(custom);
    expect(getAuthorityProvider().name).toBe("test-provider");
    _setAuthorityProvider(null);
  });
});
