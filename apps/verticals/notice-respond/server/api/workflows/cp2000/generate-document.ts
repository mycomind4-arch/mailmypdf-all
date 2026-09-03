/**
 * POST /api/workflows/cp2000/generate-document
 * Generates response letters and supporting documents for CP2000 notices
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import {
  generateAgreementLetter,
  generateDisagreementLetter,
  generatePartialAgreementLetter,
  generateAppealRequest,
  generateExtensionRequest,
  generateAttorneyReferral,
} from "../../../../src/domain/workflows/cp2000/document-generation";
import type {
  GeneratedDocument,
  AgreementResponsePayload,
  DisagreementResponsePayload,
  PartialAgreementPayload,
  AppealRequestPayload,
  ExtensionRequestPayload,
  CP2000IntakeConfirmation,
} from "../../../../src/domain/workflows/cp2000/types";

type DocumentType =
  | "agreement-letter"
  | "disagreement-letter"
  | "partial-agreement-letter"
  | "appeal-request"
  | "extension-request"
  | "attorney-referral";

interface GenerateDocumentRequest {
  type: DocumentType;
  intake: CP2000IntakeConfirmation;
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
        case "agreement-letter":
          document = generateAgreementLetter(req.payload as AgreementResponsePayload);
          break;

        case "disagreement-letter":
          document = generateDisagreementLetter(req.payload as DisagreementResponsePayload);
          break;

        case "partial-agreement-letter":
          document = generatePartialAgreementLetter(req.payload as PartialAgreementPayload);
          break;

        case "appeal-request":
          document = generateAppealRequest(req.payload as AppealRequestPayload);
          break;

        case "extension-request":
          document = generateExtensionRequest(req.payload as ExtensionRequestPayload);
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
