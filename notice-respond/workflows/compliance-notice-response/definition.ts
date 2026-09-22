import complianceNoticeResponseDomain from "./domain"
import complianceNoticeExtractionSchema from "./extraction-schema"
import complianceNoticeManifest from "./manifest"

export const complianceNoticeDefinition = {
  manifest: complianceNoticeManifest,
  domain: complianceNoticeResponseDomain,
  extractionSchema: complianceNoticeExtractionSchema,
} as const

export default complianceNoticeDefinition
