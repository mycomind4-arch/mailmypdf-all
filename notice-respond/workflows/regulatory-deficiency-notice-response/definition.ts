import regulatoryDeficiencyDomain from "./domain"
import regulatoryDeficiencyExtractionSchema from "./extraction-schema"
import regulatoryDeficiencyManifest from "./manifest"
export const regulatoryDeficiencyDefinition = {
  manifest: regulatoryDeficiencyManifest,
  domain: regulatoryDeficiencyDomain,
  extractionSchema: regulatoryDeficiencyExtractionSchema,
} as const
export default regulatoryDeficiencyDefinition
