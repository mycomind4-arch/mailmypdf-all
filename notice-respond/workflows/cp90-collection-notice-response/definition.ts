import cp90Domain from "./domain"
import cp90ExtractionSchema from "./extraction-schema"
import cp90Manifest from "./manifest"

export const cp90Definition = {
  manifest: cp90Manifest,
  domain: cp90Domain,
  extractionSchema: cp90ExtractionSchema,
} as const

export default cp90Definition
