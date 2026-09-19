/**
 * Proof-of-Service — Module Index
 *
 * Public API for the proof-of-service layer.
 *
 * Usage:
 *   import { uploadProofDocument, createCommunication, generateProofBundle } from "@/lib/proof-of-service";
 */

// Hashing utilities
export {
  hashDocument,
  hashRecord,
  hashCustodyEvent,
  verifyCustodyEvent,
  verifyRecordChain,
  verifyCustodyChain,
  canonicalJSON,
} from "./hashing";

// Types
export type {
  LegalReference,
  LegalReferenceType,
  Recipient,
  MailType,
  CommunicationStatus,
  CustodyEvent,
  CustodyEventType,
  CommunicationRecord,
  ProofDocument,
  ProofBundle,
  ResponseWindowStatus,
  Tenant,
  ApiKey,
  ProofTemplate,
  WebhookEvent,
  WebhookEventType,
} from "./types";

// Document service
export { uploadProofDocument, getProofDocument } from "./documents";

// Communication service
export {
  createCommunication,
  appendCustodyEvent,
  getCommunication,
  listCommunications,
} from "./communications";

// Proof bundle
export { generateProofBundle, computeResponseWindowEnds } from "./proof-bundle";

// Auth
export {
  authenticateRequest,
  validateApiKey,
  generateApiKey,
  hashApiKeyForStorage,
  createTenant,
} from "./auth";

// Webhooks
export { dispatchWebhook, processPendingRetries } from "./webhooks";

// Lob bridge
export { sendCommunicationViaLob, mapLobStatusToCustodyEvent, processLobEventForCommunication } from "./lob-bridge";

// Lob webhook bridge
export { handleProofOfServiceLobEvent } from "./lob-webhook-bridge";

// Address verification
export { verifyRecipientAddress, verifyAndRecord } from "./address-verification";
export type { AddressVerificationResult } from "./address-verification";

// Rate limiting
export { checkTenantRateLimit, checkPublicRateLimit, addRateLimitHeaders } from "./rate-limiting";

// Client SDK
export { ProofOfServiceClient, createProofOfServiceClient } from "./client";
export type { ClientConfig } from "./client";



