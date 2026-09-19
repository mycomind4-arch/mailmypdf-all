/**
 * Letter PDF generation — re-exported from @mailmypdf/packet-builder, the
 * shared production PDF primitives package also used directly by the
 * Studio workflow acceptance engine (see
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md). Kept at this import
 * path so existing call sites in this app don't need to change.
 */
export {
  generateLetterPdf,
  generatePlainTextPdf,
  estimateLetterPageCount,
} from "@mailmypdf/packet-builder";
