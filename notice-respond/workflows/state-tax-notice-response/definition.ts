import stateTaxDomain from "./domain"
import stateTaxExtractionSchema from "./extraction-schema"
import stateTaxManifest from "./manifest"
export const stateTaxDefinition = {
  manifest: stateTaxManifest,
  domain: stateTaxDomain,
  extractionSchema: stateTaxExtractionSchema,
} as const
export default stateTaxDefinition
