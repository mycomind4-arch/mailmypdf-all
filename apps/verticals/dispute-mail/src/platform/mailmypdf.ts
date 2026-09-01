/**
 * Dispute Mail compatibility shim for the shared MailMyPDF HTTP client.
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
