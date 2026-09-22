import unemploymentDomain from "./domain"
import unemploymentExtractionSchema from "./extraction-schema"
import unemploymentManifest from "./manifest"
export const unemploymentDefinition = {
  manifest: unemploymentManifest,
  domain: unemploymentDomain,
  extractionSchema: unemploymentExtractionSchema,
} as const
export default unemploymentDefinition
