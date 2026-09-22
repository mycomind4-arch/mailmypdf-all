import irsIncomeDomain from "./domain"
import irsIncomeExtractionSchema from "./extraction-schema"
import irsIncomeManifest from "./manifest"
export const irsIncomeDefinition = {
  manifest: irsIncomeManifest,
  domain: irsIncomeDomain,
  extractionSchema: irsIncomeExtractionSchema,
} as const
export default irsIncomeDefinition
