/**
 * Authority provider abstraction for Private Office.
 *
 * Authority research is source-first, not LLM-first. The official-source
 * provider may retrieve only explicitly supplied, validated official URLs and
 * returns deterministic excerpts with retrieval provenance. It never invents
 * statutes, cases, regulations, citations, URLs, deadlines, or applicability.
 */

export interface AuthorityCitation {
  title: string;
  type: "statute" | "case" | "regulation" | "guidance" | "article";
  reference: string;
  summary: string;
  url?: string;
  retrievedAt?: string;
  contentHash?: string;
  sourceHost?: string;
  contentType?: string;
}

export interface AuthorityFetchFailure {
  url: string;
  reason: string;
}

export interface AuthorityResult {
  /** Whether at least one external source was actually retrieved. */
  researchPerformed: boolean;
  /** Citations created only from successfully retrieved sources. */
  citations: AuthorityCitation[];
  /** Per-source failures; failures never become citations. */
  failures?: AuthorityFetchFailure[];
  /** Honest disclaimer about research status and applicability. */
  disclaimer: string;
  /** externally_sourced only when actual source retrieval occurred. */
  provenance: "externally_sourced" | "system_generated";
}

export interface AuthorityRequest {
  workflowId: string;
  context: string;
  jurisdiction?: string;
  /** Explicit official URLs supplied for this matter. */
  sourceUrls?: readonly string[];
}

export interface AuthorityProvider {
  readonly name: string;
  research(request: AuthorityRequest): Promise<AuthorityResult>;
}

const MAX_AUTHORITY_SOURCES = 6;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 12_000;
const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "application/xhtml+xml",
  "application/json",
] as const;

function configuredTrustedHosts(): Set<string> {
  return new Set(
    (process.env.AUTHORITY_TRUSTED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isIpLiteral(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host.includes(":")) return true;
  const parts = host.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part)) &&
    parts.every((part) => Number(part) >= 0 && Number(part) <= 255)
  );
}

function isOfficialHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isIpLiteral(host)) return false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }

  if (host.endsWith(".gov") || host.endsWith(".mil")) return true;
  return configuredTrustedHosts().has(host);
}

/**
 * Validate an authority URL before every network request, including redirects.
 * This intentionally fail-closes: HTTPS, default port, official/allowlisted
 * host, no URL credentials, and no IP literals.
 */
export function validateAuthorityUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Authority source URL is not a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Authority sources must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Authority source URLs cannot contain credentials.");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Authority source URLs cannot use a custom port.");
  }
  if (!isOfficialHost(url.hostname)) {
    throw new Error(
      "Authority source host is not an approved official host. Use a .gov/.mil source or a server-configured trusted host.",
    );
  }

  url.hash = "";
  return url;
}

function contentTypeBase(response: Response): string {
  return (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.some((allowed) => contentType === allowed);
}

async function readTextWithLimit(
  response: Response,
  maxBytes = MAX_RESPONSE_BYTES,
): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Authority source exceeds the ${maxBytes}-byte response limit.`);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(
          `Authority source exceeds the ${maxBytes}-byte response limit.`,
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function decodeCommonHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

function htmlToText(html: string): string {
  return decodeCommonHtmlEntities(
    html
      .replace(/<!--[^]*?-->/g, " ")
      .replace(/<script\b[^]*?<\/script>/gi, " ")
      .replace(/<style\b[^]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function sourceTitle(raw: string, contentType: string, url: URL): string {
  if (contentType === "text/html" || contentType === "application/xhtml+xml") {
    const match = raw.match(/<title[^>]*>([^]*?)<\/title>/i);
    const title = match ? htmlToText(match[1]) : "";
    if (title) return title.slice(0, 300);
  }
  return url.hostname + url.pathname;
}

function sourceText(raw: string, contentType: string): string {
  if (contentType === "text/html" || contentType === "application/xhtml+xml") {
    return htmlToText(raw);
  }
  return raw.replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "authority",
  "because",
  "before",
  "being",
  "context",
  "could",
  "determine",
  "from",
  "have",
  "into",
  "jurisdiction",
  "matter",
  "official",
  "research",
  "source",
  "their",
  "there",
  "these",
  "this",
  "under",
  "what",
  "when",
  "where",
  "which",
  "with",
  "workflow",
]);

function contextualExcerpt(text: string, context: string, maxChars = 1600): string {
  if (text.length <= maxChars) return text;

  const terms = context
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9-]{3,}/g)
    ?.filter((term) => !STOP_WORDS.has(term)) ?? [];

  const lower = text.toLowerCase();
  let index = -1;
  for (const term of terms) {
    index = lower.indexOf(term);
    if (index >= 0) break;
  }

  if (index < 0) return text.slice(0, maxChars);
  const start = Math.max(0, index - Math.floor(maxChars / 3));
  return text.slice(start, start + maxChars);
}

function citationType(url: URL, text: string): AuthorityCitation["type"] {
  const haystack = `${url.pathname} ${text.slice(0, 500)}`.toLowerCase();
  if (/\b(opinion|case|court decision)\b/.test(haystack)) return "case";
  if (/\b(cfr|regulation|regulations|administrative code)\b/.test(haystack)) {
    return "regulation";
  }
  if (/\b(statute|statutes|code section|united states code|usc)\b/.test(haystack)) {
    return "statute";
  }
  return "guidance";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchOfficialSource(
  initialUrl: string,
  context: string,
  timeoutMs: number,
): Promise<AuthorityCitation> {
  let url = validateAuthorityUrl(initialUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        headers: {
          Accept: "text/html,text/plain,application/xhtml+xml,application/json;q=0.8",
          "User-Agent": "MailMyPDF-Authority-Retriever/1.0",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Authority source request timed out.");
      }
      throw new Error(
        `Authority source request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Authority source returned a redirect without a location.");
      }
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error("Authority source exceeded the redirect limit.");
      }
      url = validateAuthorityUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Authority source returned HTTP ${response.status}.`);
    }

    const contentType = contentTypeBase(response);
    if (!isAllowedContentType(contentType)) {
      throw new Error(
        `Unsupported authority source content type "${contentType || "unknown"}". HTML, plain text, XHTML, and JSON are supported.`,
      );
    }

    const raw = await readTextWithLimit(response);
    const text = sourceText(raw, contentType);
    if (!text) throw new Error("Authority source returned no readable text.");

    const retrievedAt = new Date().toISOString();
    return {
      title: sourceTitle(raw, contentType, url),
      type: citationType(url, text),
      reference: url.toString(),
      summary: contextualExcerpt(text, context),
      url: url.toString(),
      retrievedAt,
      contentHash: await sha256(raw),
      sourceHost: url.hostname.toLowerCase(),
      contentType,
    };
  }

  throw new Error("Authority source could not be retrieved.");
}

/**
 * Source-backed authority retrieval. This provider only fetches explicit URLs
 * that pass the official-host policy. It does not search the open web and does
 * not ask an LLM to manufacture authority.
 */
export class OfficialSourceAuthorityProvider implements AuthorityProvider {
  readonly name = "official-source";

  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  async research(request: AuthorityRequest): Promise<AuthorityResult> {
    const sourceUrls = [...new Set(request.sourceUrls ?? [])].slice(
      0,
      MAX_AUTHORITY_SOURCES,
    );

    if (sourceUrls.length === 0) {
      return {
        researchPerformed: false,
        citations: [],
        failures: [],
        disclaimer:
          "No official authority source URL was supplied, so no external authority research was performed. Add an official .gov/.mil source (or server-approved trusted host) to ground this phase.",
        provenance: "system_generated",
      };
    }

    const citations: AuthorityCitation[] = [];
    const failures: AuthorityFetchFailure[] = [];

    for (const sourceUrl of sourceUrls) {
      try {
        citations.push(
          await fetchOfficialSource(sourceUrl, request.context, this.timeoutMs),
        );
      } catch (error) {
        failures.push({
          url: sourceUrl,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const researchPerformed = citations.length > 0;
    return {
      researchPerformed,
      citations,
      failures,
      disclaimer: researchPerformed
        ? "Official source material was retrieved directly from the cited URL(s). The excerpts are deterministic source text, not an AI legal conclusion. Review the full source, jurisdiction, effective date, and applicability before relying on it."
        : "No supplied official authority source could be retrieved. No citation or legal authority was inferred from failed requests.",
      provenance: researchPerformed ? "externally_sourced" : "system_generated",
    };
  }
}

/**
 * Honest null provider retained for explicit opt-out and tests.
 */
export class NullAuthorityProvider implements AuthorityProvider {
  readonly name = "null";

  async research(_request: AuthorityRequest): Promise<AuthorityResult> {
    return {
      researchPerformed: false,
      citations: [],
      failures: [],
      disclaimer:
        "No external authority research was performed. Strategy and risk assessment are based solely on user-provided facts and deterministic workflow analysis. Do not rely on this output as legal authority.",
      provenance: "system_generated",
    };
  }
}

let cachedProvider: AuthorityProvider | null = null;

/**
 * Official-source retrieval is the safe default because it requires no secret
 * and performs no search when the user supplies no source URL. Set
 * AUTHORITY_PROVIDER=null to explicitly disable external retrieval.
 */
export function getAuthorityProvider(): AuthorityProvider {
  if (cachedProvider !== null) return cachedProvider;

  cachedProvider =
    process.env.AUTHORITY_PROVIDER === "null"
      ? new NullAuthorityProvider()
      : new OfficialSourceAuthorityProvider();
  return cachedProvider;
}

export function _setAuthorityProvider(provider: AuthorityProvider | null): void {
  cachedProvider = provider;
}

export function _resetAuthorityProvider(): void {
  cachedProvider = null;
}
