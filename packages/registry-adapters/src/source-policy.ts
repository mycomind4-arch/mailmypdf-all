import { RegistryAdapterError } from "./errors.js";
import type { RegistrySourceDescriptor } from "./types.js";

export function assertRegistrySourceUsable(source: RegistrySourceDescriptor): void {
  if (!source.enabled) {
    throw new RegistryAdapterError({
      code: "SOURCE_DISABLED",
      message: `Registry source ${source.id} is disabled.`,
      sourceId: source.id,
    });
  }
  if (!source.officialUrl.startsWith("https://")) {
    throw new RegistryAdapterError({
      code: "SOURCE_REQUIRES_HTTPS",
      message: `Registry source ${source.id} must use HTTPS.`,
      sourceId: source.id,
    });
  }

  const compliance = source.compliance;
  if (
    compliance?.robotsChecked === false ||
    compliance?.termsReviewed === false ||
    compliance?.automationAllowed === false
  ) {
    throw new RegistryAdapterError({
      code: "SOURCE_REQUIRES_COMPLIANCE_REVIEW",
      message: `Registry source ${source.id} is not approved for automated access.`,
      sourceId: source.id,
    });
  }

  if (
    (source.accessMethod === "html" || source.accessMethod === "browser") &&
    (!compliance || compliance.robotsChecked !== true || compliance.termsReviewed !== true)
  ) {
    throw new RegistryAdapterError({
      code: "SOURCE_REQUIRES_COMPLIANCE_REVIEW",
      message: `Registry source ${source.id} requires explicit robots and terms review before HTML/browser automation.`,
      sourceId: source.id,
    });
  }
}

export function sourceSupportsCapability(
  source: RegistrySourceDescriptor,
  capability: RegistrySourceDescriptor["capabilities"][number],
): boolean {
  return source.capabilities.includes(capability);
}

export interface RegistryArtifact {
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  contentType: string;
  content: string;
  metadata?: Record<string, string>;
}

/**
 * Normalizes a captured registry artifact (a page/response actually
 * retrieved from a source) so two captures of the same underlying content
 * compare and hash identically regardless of line-ending or timestamp
 * formatting quirks, and so metadata keys are in a stable order.
 */
export function normalizeRegistryArtifact(input: RegistryArtifact): RegistryArtifact {
  const retrievedAt = new Date(input.retrievedAt).toISOString();
  const content = input.content.replace(/\r\n/g, "\n");
  const metadata = input.metadata
    ? Object.fromEntries(
        Object.entries(input.metadata).sort(([left], [right]) => left.localeCompare(right)),
      )
    : undefined;

  return {
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    retrievedAt,
    contentType: input.contentType,
    content,
    ...(metadata ? { metadata } : {}),
  };
}
