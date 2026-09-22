/* Definition for administrative hearing notice response workflow.
 * Bundles the manifest, domain, and extraction schemas together.
 */

import administrativeHearingNoticeResponseDomain from "./domain"
import administrativeHearingNoticeExtractionSchema from "./extraction-schema"
import administrativeHearingManifest from "./manifest"

export const administrativeHearingDefinition = {
  manifest: administrativeHearingManifest,
  domain: administrativeHearingNoticeResponseDomain,
  extractionSchema: administrativeHearingNoticeExtractionSchema,
} as const

export default administrativeHearingDefinition
