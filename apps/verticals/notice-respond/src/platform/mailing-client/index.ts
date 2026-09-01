/**
 * Notice Respond compatibility shim for the shared MailMyPDF HTTP client.
 *
 * The implementation lives in @mailmypdf/mailing-client. Existing import
 * paths are retained so vertical/domain code does not need a broad rewrite.
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
  MailingRecipient,
  CreateCommunicationInput,
  MailMyPDFCommunication,
} from "@mailmypdf/mailing-client";
