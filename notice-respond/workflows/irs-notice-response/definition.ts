import irsGeneralDomain from "./domain"
import irsGeneralExtractionSchema from "./extraction-schema"
import irsGeneralManifest from "./manifest"
import { assessIrsGeneralMailPacketReadiness } from "./mail-readiness"
import { prepareIrsGeneralLetterPreview } from "./letter-preview"
import { prepareIrsGeneralPdfPreview } from "./pdf-preview"
import { prepareIrsGeneralPacketPreview } from "./packet-preview"
import { prepareIrsGeneralOwnedPacketPreview } from "./owned-packet-preview"
import { prepareAndPersistIrsGeneralOwnedDraft } from "./owned-packet-draft"
import { loadIrsGeneralOwnedDraftForReview } from "./owned-packet-review"
import { approveIrsGeneralOwnedDraft } from "./owned-packet-approval"
export const irsGeneralDefinition = {
  manifest: irsGeneralManifest,
  domain: irsGeneralDomain,
  extractionSchema: irsGeneralExtractionSchema,
  mailPacketReadiness: assessIrsGeneralMailPacketReadiness,
  prepareLetterPreview: prepareIrsGeneralLetterPreview,
  preparePdfPreview: prepareIrsGeneralPdfPreview,
  preparePacketPreview: prepareIrsGeneralPacketPreview,
  prepareOwnedPacketPreview: prepareIrsGeneralOwnedPacketPreview,
  prepareAndPersistOwnedDraft: prepareAndPersistIrsGeneralOwnedDraft,
  loadOwnedDraftForReview: loadIrsGeneralOwnedDraftForReview,
  approveOwnedDraft: approveIrsGeneralOwnedDraft,
} as const
export default irsGeneralDefinition
