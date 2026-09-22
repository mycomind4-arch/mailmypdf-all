import irsGeneralDomain from "./domain"
import irsGeneralExtractionSchema from "./extraction-schema"
import irsGeneralManifest from "./manifest"
export const irsGeneralDefinition = {
  manifest: irsGeneralManifest,
  domain: irsGeneralDomain,
  extractionSchema: irsGeneralExtractionSchema,
} as const
export default irsGeneralDefinition
