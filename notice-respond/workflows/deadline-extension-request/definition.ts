import deadlineExtensionRequestDomain from "./domain"
import deadlineExtensionExtractionSchema from "./extraction-schema"
import deadlineExtensionManifest from "./manifest"

export const deadlineExtensionDefinition = {
  manifest: deadlineExtensionManifest,
  domain: deadlineExtensionRequestDomain,
  extractionSchema: deadlineExtensionExtractionSchema,
} as const

export default deadlineExtensionDefinition
