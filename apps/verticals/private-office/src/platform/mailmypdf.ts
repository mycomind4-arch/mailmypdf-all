/**
 * Private Office compatibility shim for the shared MailMyPDF HTTP client.
 *
 * Private Office keeps its domain-specific provider contract in
 * mailmypdf-provider.ts, while transport/auth/error handling lives in the
 * canonical @mailmypdf/mailing-client package.
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
  MailingRecipient as PrivateOfficeRecipient,
  CreateCommunicationInput,
  MailMyPDFCommunication,
  MailingClient,
} from "@mailmypdf/mailing-client";
