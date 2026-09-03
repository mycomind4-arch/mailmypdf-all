/**
 * POST /api/workflows/cp2000/classify
 * Classifies CP2000 situation and routes to appropriate response path
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { classifyCP2000Response } from "../../../../src/domain/workflows/cp2000/classification";
import type {
  CP2000IntakeConfirmation,
  CP2000ClassificationRequest,
  CP2000ClassificationResult,
} from "../../../../src/domain/workflows/cp2000/types";

interface ClassifyCP2000Request {
  intake: CP2000IntakeConfirmation;
  agree_with_all: boolean;
  has_supporting_evidence: boolean;
  adjustment_amount: number;
  has_penalties: boolean;
  wants_appeal?: boolean;
  needs_extension?: boolean;
  prior_audit?: boolean;
  criminal_record?: boolean;
}

interface ClassifyCP2000Response {
  success: boolean;
  classification?: CP2000ClassificationResult;
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ClassifyCP2000Response> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ClassifyCP2000Request;
    try {
      req = await readBody<ClassifyCP2000Request>(event);
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body.",
      });
    }

    // Validate required fields
    if (!req.intake || !req.intake.extraction) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing intake data. Must run extraction first.",
      });
    }

    if (typeof req.agree_with_all !== "boolean") {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid agree_with_all field.",
      });
    }

    if (typeof req.adjustment_amount !== "number" || req.adjustment_amount < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid adjustment_amount field.",
      });
    }

    try {
      const classification = await classifyCP2000Response({
        intake: req.intake,
        agree_with_all: req.agree_with_all,
        has_supporting_evidence: req.has_supporting_evidence,
        adjustment_amount: req.adjustment_amount,
        has_penalties: req.has_penalties,
        wants_appeal: req.wants_appeal,
        needs_extension: req.needs_extension,
        prior_audit: req.prior_audit,
        criminal_record: req.criminal_record,
      } as CP2000ClassificationRequest);

      return {
        success: true,
        classification,
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
