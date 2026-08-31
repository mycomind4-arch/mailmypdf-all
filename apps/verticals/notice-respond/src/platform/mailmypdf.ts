/**
 * Notice Respond MailMyPDF adapter.
 * Re-exports from the local mailing-client shim.
 */

export {
  uploadDocument,
  uploadDocumentBase64,
  createCommunication,
  getCommunication,
  createMailingClient,
  MailMyPDFPlatformError,
  type MailType,
  type MailMyPDFDocument,
  type MailMyPDFCommunication,
  type MailingRecipient as NoticeRecipient,
  type CreateCommunicationInput as CreateNoticeCommunicationInput,
} from "./mailing-client";
