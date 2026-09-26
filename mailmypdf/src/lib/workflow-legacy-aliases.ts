import { workflowById, type WorkflowId } from "./workflow-registry"

const LEGACY_SECTION_PREFIXES: Readonly<Record<string, string>> = {
  appeal: "appeal-mail",
  benefits: "benefits-appeal",
  claim: "claim-proof",
  dispute: "dispute-mail",
  immigration: "immigration-mail",
  insurance: "insurance-claims",
  notice: "notice-respond",
  permit: "permit-reply",
  records: "records-request",
  business: "small-business",
  tenant: "tenant-reply",
}

/**
 * Explicitly reviewed identity migrations where the workflow slug itself
 * changed. Keep this small and evidence-based; fuzzy matching is forbidden.
 */
export const LEGACY_WORKFLOW_ID_ALIASES: Readonly<Record<string, WorkflowId>> = {
  "appeal/ssdi-denial": "appeal-mail/appeal-ssdi-denial",
  "appeal/ssi-denial": "appeal-mail/appeal-ssi-denial",
  "benefits/hearing-preparation": "benefits-appeal/benefits-hearing-preparation",
  "legal-defense/wrongful-stolen-vehicle-arrest": "legal-defense/stolen-vehicle-arrest-defense",
  "notice/irs-notice": "notice-respond/irs-notice-response",
  "notice/agency-action": "notice-respond/agency-action-response",
  "records/follow-up": "records-request/records-follow-up-request",
}

export function canonicalWorkflowIdForLegacyId(legacyId: string): WorkflowId | null {
  const normalized = legacyId.trim().replace(/^\/+|\/+$/g, "")
  if (!normalized) return null

  const explicit = LEGACY_WORKFLOW_ID_ALIASES[normalized]
  if (explicit) return workflowById(explicit)?.id ?? null

  const [legacySection, ...slugParts] = normalized.split("/")
  if (!legacySection || !slugParts.length) return null
  const section = LEGACY_SECTION_PREFIXES[legacySection] ?? legacySection
  const candidate = `${section}/${slugParts.join("/")}`
  return workflowById(candidate)?.id ?? null
}

export function canonicalWorkflowPathForLegacyPath(path: string): string | null {
  const normalized = path.trim().replace(/^\/+|\/+$/g, "")
  if (!normalized) return null

  const parts = normalized.split("/")
  if (parts[1] === "workflows") {
    if (parts.length !== 3) return null
    const canonicalId = canonicalWorkflowIdForLegacyId(`${parts[0]}/${parts[2]}`)
    return canonicalId ? workflowById(canonicalId)?.publicHref ?? null : null
  }

  const canonicalId = canonicalWorkflowIdForLegacyId(normalized)
  return canonicalId ? workflowById(canonicalId)?.publicHref ?? null : null
}
