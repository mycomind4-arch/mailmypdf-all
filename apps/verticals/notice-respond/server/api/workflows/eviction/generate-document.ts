/**
 * POST /api/workflows/eviction/generate-document
 * Generates response letters, declarations, and proof of service documents
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import {
  generatePaymentProposalLetter,
  generateContestLetter,
  generateDeclaration,
  generateProofOfService,
} from "../../../src/domain/workflows/eviction/document-generation";
import type {
  GeneratedDocument,
  PaymentProposalPayload,
  ContestDefensePayload,
  EvictionIntakeConfirmation,
} from "../../../src/domain/workflows/eviction/types";

type DocumentType = "payment-letter" | "contest-letter" | "declaration" | "proof-of-service";

interface GenerateDocumentRequest {
  type: DocumentType;
  intake: EvictionIntakeConfirmation;
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
        case "payment-letter":
          document = generatePaymentProposalLetter(req.payload as PaymentProposalPayload);
          break;

        case "contest-letter":
          document = generateContestLetter(req.payload as ContestDefensePayload);
          break;

        case "declaration":
          const statements = (req.payload as Record<string, Record<string, string>>).statements ||
            {};
          document = generateDeclaration(req.intake, statements);
          break;

        case "proof-of-service":
          const serviceMethod = (req.payload as { method: string }).method as
            | "usps-certified"
            | "hand-delivery"
            | "email";
          document = generateProofOfService(req.intake, serviceMethod);
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
