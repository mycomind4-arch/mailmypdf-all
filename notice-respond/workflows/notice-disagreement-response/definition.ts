import noticeDisagreementDomain from "./domain"
import noticeDisagreementExtractionSchema from "./extraction-schema"
import noticeDisagreementManifest from "./manifest"
export const noticeDisagreementDefinition = {
  manifest: noticeDisagreementManifest,
  domain: noticeDisagreementDomain,
  extractionSchema: noticeDisagreementExtractionSchema,
} as const
export default noticeDisagreementDefinition
