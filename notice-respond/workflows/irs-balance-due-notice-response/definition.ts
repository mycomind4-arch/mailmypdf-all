import irsBalanceDueDomain from "./domain"
import irsBalanceDueExtractionSchema from "./extraction-schema"
import irsBalanceDueManifest from "./manifest"

export const irsBalanceDueDefinition = {
  manifest: irsBalanceDueManifest,
  domain: irsBalanceDueDomain,
  extractionSchema: irsBalanceDueExtractionSchema,
} as const

export default irsBalanceDueDefinition
