import irsGeneralDomain from "./domain"
import irsGeneralExtractionSchema from "./extraction-schema"
import irsGeneralManifest from "./manifest"
import { assessIrsGeneralMailPacketReadiness } from "./mail-readiness"
import { prepareIrsGeneralLetterPreview } from "./letter-preview"
import { prepareIrsGeneralPdfPreview } from "./pdf-preview"
export const irsGeneralDefinition = {
  manifest: irsGeneralManifest,
  domain: irsGeneralDomain,
  extractionSchema: irsGeneralExtractionSchema,
  mailPacketReadiness: assessIrsGeneralMailPacketReadiness,
  prepareLetterPreview: prepareIrsGeneralLetterPreview,
  preparePdfPreview: prepareIrsGeneralPdfPreview,
} as const
export default irsGeneralDefinition
