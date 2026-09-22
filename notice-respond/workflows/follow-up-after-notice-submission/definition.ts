import followUpAfterNoticeDomain from "./domain"
import followUpAfterNoticeExtractionSchema from "./extraction-schema"
import followUpAfterNoticeManifest from "./manifest"

export const followUpAfterNoticeDefinition = {
  manifest: followUpAfterNoticeManifest,
  domain: followUpAfterNoticeDomain,
  extractionSchema: followUpAfterNoticeExtractionSchema,
} as const

export default followUpAfterNoticeDefinition
