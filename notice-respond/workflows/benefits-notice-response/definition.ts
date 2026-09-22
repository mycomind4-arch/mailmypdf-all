/* Definition for benefits notice response workflow */

import benefitsNoticeResponseDomain from "./domain"
import benefitsNoticeExtractionSchema from "./extraction-schema"
import benefitsNoticeManifest from "./manifest"

export const benefitsNoticeDefinition = {
  manifest: benefitsNoticeManifest,
  domain: benefitsNoticeResponseDomain,
  extractionSchema: benefitsNoticeExtractionSchema,
} as const

export default benefitsNoticeDefinition
