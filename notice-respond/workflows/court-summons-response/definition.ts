/* Definition for court summons response workflow */

import courtSummonsResponseDomain from "./domain"
import courtSummonsExtractionSchema from "./extraction-schema"
import courtSummonsManifest from "./manifest"

export const courtSummonsDefinition = {
  manifest: courtSummonsManifest,
  domain: courtSummonsResponseDomain,
  extractionSchema: courtSummonsExtractionSchema,
} as const

export default courtSummonsDefinition
