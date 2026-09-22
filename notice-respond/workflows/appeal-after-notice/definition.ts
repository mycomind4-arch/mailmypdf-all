import appealAfterNoticeDomain from "./domain"
import appealAfterNoticeExtractionSchema from "./extraction-schema"
import appealAfterNoticeManifest from "./manifest"

export const appealAfterNoticeDefinition = {
  manifest: appealAfterNoticeManifest,
  domain: appealAfterNoticeDomain,
  extractionSchema: appealAfterNoticeExtractionSchema,
} as const

export default appealAfterNoticeDefinition
