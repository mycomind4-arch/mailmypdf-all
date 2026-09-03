/**
 * Dispute Mail compatibility shim for the shared MailMyPDF HTTP client.
 * The shared client owns the canonical /v1/documents and /v1/communications
 * requests, preserves multipart boundaries, and sends Idempotency-Key for
 * communication creation. Its request guard is `!(init.body instanceof FormData)`
 * so multipart uploads retain their runtime-generated boundary.
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
  MailingRecipient as DisputeRecipient,
  CreateCommunicationInput as CreateDisputeCommunicationInput,
  MailMyPDFCommunication,
  LegalReference,
  MailingClient,
} from "@mailmypdf/mailing-client";
