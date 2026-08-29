/**
 * DisputeMail Vertical Module
 *
 * Registers DisputeMail's AI configuration and dispute categories
 * with the canonical MailMyPDF infrastructure.
 *
 * This is a THIN vertical — no duplicate payment, order, fulfillment,
 * webhook, tracking, or proof systems. Everything flows through the
 * canonical MailMyPDF infrastructure.
 */

export { DISPUTE_CATEGORIES, type DisputeCategory } from "./categories";
export { registerDisputeMailAI } from "./ai-config";
export type {
  DisputeIntake,
  DisputeFacts,
  DisputeDraftRequest,
  DisputeDraftResponse,
} from "./types";
