/**
 * POST /api/workflows/notice-of-deficiency/classify
 * Classifies Notice of Deficiency situation and routes to response path
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { classifyDeficiencyResponse } from "../../../../src/domain/workflows/notice-of-deficiency/classification";
import type {
  DeficiencyIntakeConfirmation,
  DeficiencyClassificationRequest,
  DeficiencyClassificationResult,
} from "../../../../src/domain/workflows/notice-of-deficiency/types";

interface ClassifyDeficiencyRequest {
  intake: DeficiencyIntakeConfirmation;
  taxpayer_agrees: boolean;
  has_evidence: boolean;
  deficiency_amount: number;
  can_pay_full: boolean;
  wants_tax_court?: boolean;
  is_joint_return?: boolean;
  hardship_situation?: boolean;
  has_fraud_allegations?: boolean;
}

interface ClassifyDeficiencyResponse {
  success: boolean;
  classification?: DeficiencyClassificationResult;
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ClassifyDeficiencyResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ClassifyDeficiencyRequest;
    try {
      req = await readBody<ClassifyDeficiencyRequest>(event);
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

    if (typeof req.taxpayer_agrees !== "boolean") {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid taxpayer_agrees field.",
      });
    }

    if (typeof req.deficiency_amount !== "number" || req.deficiency_amount < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid deficiency_amount field.",
      });
    }

    try {
      const classification = await classifyDeficiencyResponse({
        intake: req.intake,
        taxpayer_agrees: req.taxpayer_agrees,
        has_evidence: req.has_evidence,
        deficiency_amount: req.deficiency_amount,
        can_pay_full: req.can_pay_full,
        wants_tax_court: req.wants_tax_court,
        is_joint_return: req.is_joint_return,
        hardship_situation: req.hardship_situation,
        has_fraud_allegations: req.has_fraud_allegations,
      } as DeficiencyClassificationRequest);

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
