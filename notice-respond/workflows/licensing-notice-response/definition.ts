import licensingDomain from "./domain"
import licensingExtractionSchema from "./extraction-schema"
import licensingManifest from "./manifest"
export const licensingDefinition = {
  manifest: licensingManifest,
  domain: licensingDomain,
  extractionSchema: licensingExtractionSchema,
} as const
export default licensingDefinition
