import agencyActionResponseDomain from "./domain"
import agencyActionExtractionSchema from "./extraction-schema"
import agencyActionManifest from "./manifest"

export const agencyActionDefinition = {
  manifest: agencyActionManifest,
  domain: agencyActionResponseDomain,
  extractionSchema: agencyActionExtractionSchema,
} as const

export default agencyActionDefinition
