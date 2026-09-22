import irsIdentityDomain from "./domain"
import irsIdentityExtractionSchema from "./extraction-schema"
import irsIdentityManifest from "./manifest"
export const irsIdentityDefinition = {
  manifest: irsIdentityManifest,
  domain: irsIdentityDomain,
  extractionSchema: irsIdentityExtractionSchema,
} as const
export default irsIdentityDefinition
