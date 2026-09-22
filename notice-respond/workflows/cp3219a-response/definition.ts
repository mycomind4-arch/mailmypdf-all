import cp3219aDomain from "./domain"
import cp3219aExtractionSchema from "./extraction-schema"
import cp3219aManifest from "./manifest"

export const cp3219aDefinition = {
  manifest: cp3219aManifest,
  domain: cp3219aDomain,
  extractionSchema: cp3219aExtractionSchema,
} as const

export default cp3219aDefinition
