/**
 * POST /api/workflows/collection-due-process/generate-document
 * Generates levy prevention response documents
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import {
  generatePaymentPlanProposal,
  generateCurrentlyNotCollectibleRequest,
  generateOfferInCompromise,
  generateLiabilityDispute,
  generateLienWithdrawalRequest,
  generateLevyHardshipRelief,
  generateBankruptcyNotice,
  generateAttorneyReferral,
} from "../../../../src/domain/workflows/collection-due-process/document-generation";
import type {
  GeneratedDocument,
  CDPIntakeConfirmation,
  PaymentPlanProposalPayload,
  NotCurrentlyCollectiblePayload,
  OfferInCompromisePayload,
  LiabilityDisputePayload,
  LienWithdrawalPayload,
  LevyHardshipReliefPayload,
} from "../../../../src/domain/workflows/collection-due-process/types";

type DocumentType =
  | "payment-plan-proposal"
  | "currently-not-collectible-request"
  | "offer-in-compromise"
  | "liability-dispute"
  | "lien-withdrawal-request"
  | "levy-hardship-relief"
  | "bankruptcy-notice"
  | "attorney-referral";

interface GenerateDocumentRequest {
  type: DocumentType;
  intake: CDPIntakeConfirmation;
  payload?: Record<string, unknown>;
}

interface GenerateDocumentResponse {
  success: boolean;
  document?: GeneratedDocument;
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<GenerateDocumentResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: GenerateDocumentRequest;
    try {
      req = await readBody<GenerateDocumentRequest>(event);
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body.",
      });
    }

    // Validate required fields
    if (!req.type) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing document type.",
      });
    }

    if (!req.intake || !req.intake.extraction) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing intake data.",
      });
    }

    try {
      let document: GeneratedDocument;

      switch (req.type) {
        case "payment-plan-proposal":
          document = generatePaymentPlanProposal(
            req.intake,
            req.payload as PaymentPlanProposalPayload
          );
          break;

        case "currently-not-collectible-request":
          document = generateCurrentlyNotCollectibleRequest(
            req.intake,
            req.payload as NotCurrentlyCollectiblePayload
          );
          break;

        case "offer-in-compromise":
          document = generateOfferInCompromise(
            req.intake,
            req.payload as OfferInCompromisePayload
          );
          break;

        case "liability-dispute":
          document = generateLiabilityDispute(
            req.intake,
            req.payload as LiabilityDisputePayload
          );
          break;

        case "lien-withdrawal-request":
          document = generateLienWithdrawalRequest(
            req.intake,
            req.payload as LienWithdrawalPayload
          );
          break;

        case "levy-hardship-relief":
          document = generateLevyHardshipRelief(
            req.intake,
            req.payload as LevyHardshipReliefPayload
          );
          break;

        case "bankruptcy-notice":
          document = generateBankruptcyNotice(req.intake);
          break;

        case "attorney-referral":
          document = generateAttorneyReferral(req.intake);
          break;

        default:
          throw new Error(`Unknown document type: ${req.type}`);
      }

      return {
        success: true,
        document,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: message,
      };
    }
  }
);
