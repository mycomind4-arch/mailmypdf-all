import civilSummonsDomain from "./domain"
import civilSummonsExtractionSchema from "./extraction-schema"
import civilSummonsManifest from "./manifest"

export const civilSummonsDefinition = {
  manifest: civilSummonsManifest,
  domain: civilSummonsDomain,
  extractionSchema: civilSummonsExtractionSchema,
} as const

export default civilSummonsDefinition
