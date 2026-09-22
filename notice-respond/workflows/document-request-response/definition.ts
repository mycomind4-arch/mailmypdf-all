import documentRequestDomain from "./domain"
import documentRequestExtractionSchema from "./extraction-schema"
import documentRequestManifest from "./manifest"

export const documentRequestDefinition = {
  manifest: documentRequestManifest,
  domain: documentRequestDomain,
  extractionSchema: documentRequestExtractionSchema,
} as const

export default documentRequestDefinition
