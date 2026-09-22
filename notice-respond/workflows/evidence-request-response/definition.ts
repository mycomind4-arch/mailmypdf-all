import evidenceRequestResponseDomain from "./domain"
import evidenceRequestExtractionSchema from "./extraction-schema"
import evidenceRequestManifest from "./manifest"

export const evidenceRequestDefinition = {
  manifest: evidenceRequestManifest,
  domain: evidenceRequestResponseDomain,
  extractionSchema: evidenceRequestExtractionSchema,
} as const

export default evidenceRequestDefinition
