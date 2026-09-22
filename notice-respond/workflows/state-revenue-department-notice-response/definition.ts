import stateRevenueDomain from "./domain"
import stateRevenueExtractionSchema from "./extraction-schema"
import stateRevenueManifest from "./manifest"
export const stateRevenueDefinition = {
  manifest: stateRevenueManifest,
  domain: stateRevenueDomain,
  extractionSchema: stateRevenueExtractionSchema,
} as const
export default stateRevenueDefinition
