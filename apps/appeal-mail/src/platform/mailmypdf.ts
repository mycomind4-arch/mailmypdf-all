/**
 * Appeal Mail's MailMyPDF platform adapter.
 *
 * This used to be a hand-rolled duplicate of the MailMyPDF v1 HTTP client
 * (fetch wrapper, FormData upload, error parsing) — the exact kind of
 * per-vertical copy the shared @mailmypdf/mailing-client package exists to
 * eliminate. It now delegates entirely to that shared package and only
 * re-exports it under Appeal Mail's existing import path
 * (`@/platform/mailmypdf`), so none of the 30+ call sites across the
 * analyze/checkout/webhook routes need to change.
 */
export {
  uploadDocument,
  uploadDocumentBase64,
  createCommunication,
  getCommunication,
  createMailingClient,
  MailMyPDFPlatformError,
} from "@mailmypdf/mailing-client";

export type {
  MailType,
  MailMyPDFDocument,
  MailingRecipient as AppealRecipient,
  CreateCommunicationInput as CreateAppealCommunicationInput,
  MailMyPDFCommunication,
  MailingClient,
} from "@mailmypdf/mailing-client";
