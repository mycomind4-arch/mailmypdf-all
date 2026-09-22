import irsAuditDomain from "./domain"
import irsAuditExtractionSchema from "./extraction-schema"
import irsAuditManifest from "./manifest"

export const irsAuditDefinition = {
  manifest: irsAuditManifest,
  domain: irsAuditDomain,
  extractionSchema: irsAuditExtractionSchema,
} as const

export default irsAuditDefinition
