/**
 * POST /api/workflows/notice-of-deficiency/generate-document
 * Generates response letters and supporting documents
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import {
  generateAgreementLetter,
  generateDisagreementLetter,
  generateTaxCourtPetition,
  generatePaymentPlanRequest,
  generateSettlementProposal,
  generateInnocentSpouseClaim,
  generateAttorneyReferral,
} from "../../../../src/domain/workflows/notice-of-deficiency/document-generation";
import type {
  GeneratedDocument,
  AgreementResponsePayload,
  DisagreementResponsePayload,
  TaxCourtPetitionPayload,
  PaymentPlanPayload,
  SettlementProposalPayload,
  InnocentSpousePayload,
  DeficiencyIntakeConfirmation,
} from "../../../../src/domain/workflows/notice-of-deficiency/types";

type DocumentType =
  | "agreement-response"
  | "disagreement-response"
  | "tax-court-petition"
  | "payment-plan-request"
  | "settlement-proposal"
  | "innocent-spouse-claim"
  | "attorney-referral";

interface GenerateDocumentRequest {
  type: DocumentType;
  intake: DeficiencyIntakeConfirmation;
  payload: Record<string, unknown>;
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
        case "agreement-response":
          document = generateAgreementLetter(req.payload as AgreementResponsePayload);
          break;

        case "disagreement-response":
          document = generateDisagreementLetter(req.payload as DisagreementResponsePayload);
          break;

        case "tax-court-petition":
          document = generateTaxCourtPetition(req.payload as TaxCourtPetitionPayload);
          break;

        case "payment-plan-request":
          document = generatePaymentPlanRequest(req.payload as PaymentPlanPayload);
          break;

        case "settlement-proposal":
          document = generateSettlementProposal(req.payload as SettlementProposalPayload);
          break;

        case "innocent-spouse-claim":
          document = generateInnocentSpouseClaim(req.payload as InnocentSpousePayload);
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
