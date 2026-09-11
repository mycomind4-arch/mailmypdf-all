import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NullAuthorityProvider,
  OfficialSourceAuthorityProvider,
  getAuthorityProvider,
  validateAuthorityUrl,
  _setAuthorityProvider,
  _resetAuthorityProvider,
  type AuthorityProvider,
  type AuthorityResult,
} from "./authority-provider";

const originalFetch = globalThis.fetch;
const originalAuthorityProvider = process.env.AUTHORITY_PROVIDER;
const originalTrustedHosts = process.env.AUTHORITY_TRUSTED_HOSTS;

beforeEach(() => {
  _resetAuthorityProvider();
  delete process.env.AUTHORITY_PROVIDER;
  delete process.env.AUTHORITY_TRUSTED_HOSTS;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  _resetAuthorityProvider();
  if (originalAuthorityProvider === undefined) delete process.env.AUTHORITY_PROVIDER;
  else process.env.AUTHORITY_PROVIDER = originalAuthorityProvider;
  if (originalTrustedHosts === undefined) delete process.env.AUTHORITY_TRUSTED_HOSTS;
  else process.env.AUTHORITY_TRUSTED_HOSTS = originalTrustedHosts;
});

describe("NullAuthorityProvider", () => {
  const provider = new NullAuthorityProvider();

  it("remains an honest no-research provider", async () => {
    const result = await provider.research({
      workflowId: "test",
      context: "test",
      sourceUrls: ["https://www.ca.gov/"],
    });
    expect(provider.name).toBe("null");
    expect(result.researchPerformed).toBe(false);
    expect(result.citations).toEqual([]);
    expect(result.provenance).toBe("system_generated");
    expect(result.disclaimer).toContain("No external authority research was performed");
  });
});

describe("authority URL validation", () => {
  it("accepts HTTPS .gov and .mil sources", () => {
    expect(validateAuthorityUrl("https://www.ca.gov/law").hostname).toBe("www.ca.gov");
    expect(validateAuthorityUrl("https://example.mil/rule").hostname).toBe("example.mil");
  });

  it("accepts an exact server-configured trusted host", () => {
    process.env.AUTHORITY_TRUSTED_HOSTS = "official.example.org";
    expect(validateAuthorityUrl("https://official.example.org/rule").hostname).toBe(
      "official.example.org",
    );
  });

  it.each([
    "http://www.ca.gov/rule",
    "https://127.0.0.1/rule",
    "https://[::1]/rule",
    "https://localhost/rule",
    "https://agency.local/rule",
    "https://www.ca.gov:8443/rule",
    "https://user:pass@www.ca.gov/rule",
    "https://ca.gov.evil.example/rule",
    "https://example.com/rule",
  ])("rejects unsafe or non-official URL %s", (url) => {
    expect(() => validateAuthorityUrl(url)).toThrow();
  });
});

describe("OfficialSourceAuthorityProvider", () => {
  it("performs no network request when no official URL is supplied", async () => {
    globalThis.fetch = vi.fn() as typeof fetch;
    const provider = new OfficialSourceAuthorityProvider();
    const result = await provider.research({
      workflowId: "government-accountability-investigation",
      context: "notice authority",
    });
    expect(result.researchPerformed).toBe(false);
    expect(result.citations).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("retrieves an official source with deterministic provenance", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        "<html><head><title>Official Procedure</title></head><body><main>Agency hearing procedure requires written notice before the hearing.</main></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      ),
    ) as typeof fetch;

    const result = await new OfficialSourceAuthorityProvider().research({
      workflowId: "government-accountability-investigation",
      context: "written notice hearing procedure",
      jurisdiction: "California",
      sourceUrls: ["https://agency.ca.gov/procedure"],
    });

    expect(result.researchPerformed).toBe(true);
    expect(result.provenance).toBe("externally_sourced");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({
      title: "Official Procedure",
      url: "https://agency.ca.gov/procedure",
      sourceHost: "agency.ca.gov",
      contentType: "text/html",
    });
    expect(result.citations[0]?.summary).toContain("written notice");
    expect(result.citations[0]?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("revalidates redirects and refuses a redirect to a private target", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    ) as typeof fetch;

    const result = await new OfficialSourceAuthorityProvider().research({
      workflowId: "test",
      context: "test",
      sourceUrls: ["https://agency.ca.gov/redirect"],
    });

    expect(result.researchPerformed).toBe(false);
    expect(result.citations).toEqual([]);
    expect(result.failures?.[0]?.reason).toMatch(/HTTPS|approved official host/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed on unsupported PDFs rather than pretending they were parsed", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("%PDF-fake", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
    ) as typeof fetch;

    const result = await new OfficialSourceAuthorityProvider().research({
      workflowId: "test",
      context: "test",
      sourceUrls: ["https://agency.ca.gov/order.pdf"],
    });

    expect(result.researchPerformed).toBe(false);
    expect(result.failures?.[0]?.reason).toMatch(/Unsupported authority source content type/);
  });

  it("keeps successful citations while reporting a failed second source", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Official rule text.", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      )
      .mockResolvedValueOnce(new Response("missing", { status: 404 })) as typeof fetch;

    const result = await new OfficialSourceAuthorityProvider().research({
      workflowId: "test",
      context: "rule",
      sourceUrls: [
        "https://agency.ca.gov/rule",
        "https://agency.ca.gov/missing",
      ],
    });

    expect(result.researchPerformed).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
  });
});

describe("authority provider factory", () => {
  it("defaults to official-source retrieval", () => {
    expect(getAuthorityProvider().name).toBe("official-source");
  });

  it("supports explicit null-provider opt-out", () => {
    process.env.AUTHORITY_PROVIDER = "null";
    _resetAuthorityProvider();
    expect(getAuthorityProvider().name).toBe("null");
  });

  it("returns an injected provider when set", () => {
    const custom: AuthorityProvider = {
      name: "test-provider",
      async research(): Promise<AuthorityResult> {
        return {
          researchPerformed: true,
          citations: [],
          failures: [],
          disclaimer: "Test provider",
          provenance: "externally_sourced",
        };
      },
    };
    _setAuthorityProvider(custom);
    expect(getAuthorityProvider().name).toBe("test-provider");
  });
});
