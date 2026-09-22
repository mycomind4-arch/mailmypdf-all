import irs30DayDomain from "./domain"
import irs30DayExtractionSchema from "./extraction-schema"
import irs30DayManifest from "./manifest"

export const irs30DayDefinition = {
  manifest: irs30DayManifest,
  domain: irs30DayDomain,
  extractionSchema: irs30DayExtractionSchema,
} as const

export default irs30DayDefinition
