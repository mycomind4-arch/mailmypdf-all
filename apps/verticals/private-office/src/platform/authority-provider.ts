/**
 * Authority provider abstraction for Private Office.
 *
 * The authority provider retrieves external legal/ regulatory research
 * that can enhance the workflow's strategy and risk assessment.
 *
 * CRITICAL: The NullAuthorityProvider is intentionally honest. It reports
 * that NO external research was performed. It must NEVER fabricate
 * citations, laws, cases, statutes, regulations, or URLs.
 *
 * If a real authority provider is implemented in the future, it must:
 * - Report researchPerformed accurately
 * - Mark all retrieved content with provenance = externally_sourced
 * - Never fabricate citations or references
 */

export interface AuthorityCitation {
  title: string;
  type: "statute" | "case" | "regulation" | "guidance" | "article";
  reference: string;
  summary: string;
  url?: string;
}

export interface AuthorityResult {
  /** Whether actual research was performed */
  researchPerformed: boolean;
  /** Citations found (empty if no research performed) */
  citations: AuthorityCitation[];
  /** Honest disclaimer about the research status */
  disclaimer: string;
  /** Provenance: always "externally_sourced" for real research, "system_generated" for null */
  provenance: "externally_sourced" | "system_generated";
}

export interface AuthorityRequest {
  /** The workflow type / problem domain */
  workflowId: string;
  /** Key facts and issues to research */
  context: string;
  /** Jurisdiction hint (optional) */
  jurisdiction?: string;
}

export interface AuthorityProvider {
  readonly name: string;
  research(request: AuthorityRequest): Promise<AuthorityResult>;
}

/**
 * NullAuthorityProvider — the honest default.
 *
 * Reports that no external research was performed. This is the correct
 * behavior when no live authority source is configured.
 *
 * It must be IMPOSSIBLE for "no external research performed" to be
 * represented as "research completed". This provider is the safety net.
 */
export class NullAuthorityProvider implements AuthorityProvider {
  readonly name = "null";

  async research(_request: AuthorityRequest): Promise<AuthorityResult> {
    return {
      researchPerformed: false,
      citations: [],
      disclaimer:
        "No external authority research was performed. Strategy and risk assessment are based solely on user-provided facts and deterministic workflow analysis. Do not rely on this output as legal authority.",
      provenance: "system_generated",
    };
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

let cachedProvider: AuthorityProvider | null = null;

/**
 * Returns the configured authority provider.
 * Defaults to NullAuthorityProvider when no provider is configured.
 */
export function getAuthorityProvider(): AuthorityProvider {
  if (cachedProvider !== null) return cachedProvider;

  // No live authority source configured yet — use the honest null provider.
  cachedProvider = new NullAuthorityProvider();
  return cachedProvider;
}

/**
 * Test-only: inject a custom authority provider.
 */
export function _setAuthorityProvider(provider: AuthorityProvider | null): void {
  cachedProvider = provider;
}

/**
 * Test-only: reset to default (NullAuthorityProvider).
 */
export function _resetAuthorityProvider(): void {
  cachedProvider = null;
}
