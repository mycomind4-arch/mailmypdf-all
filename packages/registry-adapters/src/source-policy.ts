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
