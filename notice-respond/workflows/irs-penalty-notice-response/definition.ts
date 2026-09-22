import irsPenaltyDomain from "./domain"
import irsPenaltyExtractionSchema from "./extraction-schema"
import irsPenaltyManifest from "./manifest"
export const irsPenaltyDefinition = {
  manifest: irsPenaltyManifest,
  domain: irsPenaltyDomain,
  extractionSchema: irsPenaltyExtractionSchema,
} as const
export default irsPenaltyDefinition
