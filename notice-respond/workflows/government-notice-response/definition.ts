import governmentNoticeDomain from "./domain"
import governmentNoticeExtractionSchema from "./extraction-schema"
import governmentNoticeManifest from "./manifest"

export const governmentNoticeDefinition = {
  manifest: governmentNoticeManifest,
  domain: governmentNoticeDomain,
  extractionSchema: governmentNoticeExtractionSchema,
} as const

export default governmentNoticeDefinition
