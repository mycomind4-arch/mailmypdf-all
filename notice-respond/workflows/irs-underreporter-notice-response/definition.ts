import irsUnderreporterDomain from "./domain"
import irsUnderreporterExtractionSchema from "./extraction-schema"
import irsUnderreporterManifest from "./manifest"
export const irsUnderreporterDefinition = {
  manifest: irsUnderreporterManifest,
  domain: irsUnderreporterDomain,
  extractionSchema: irsUnderreporterExtractionSchema,
} as const
export default irsUnderreporterDefinition
