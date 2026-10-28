import irsGeneralDomain from "./domain"
import irsGeneralExtractionSchema from "./extraction-schema"
import irsGeneralManifest from "./manifest"
import { assessIrsGeneralMailPacketReadiness } from "./mail-readiness"
export const irsGeneralDefinition = {
  manifest: irsGeneralManifest,
  domain: irsGeneralDomain,
  extractionSchema: irsGeneralExtractionSchema,
  mailPacketReadiness: assessIrsGeneralMailPacketReadiness,
} as const
export default irsGeneralDefinition
