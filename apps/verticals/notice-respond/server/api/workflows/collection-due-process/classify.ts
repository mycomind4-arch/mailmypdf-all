/**
 * POST /api/workflows/collection-due-process/classify
 * Classifies CDP response and routes through levy prevention paths
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { classifyCDPResponse } from "../../../../src/domain/workflows/collection-due-process/classification";
import { checkComplianceAfterClassification } from "../../../../src/domain/workflows/collection-due-process/guardrails";
import type {
  CDPClassificationResult,
  CDPClassificationRequest,
  CDPIntakeConfirmation,
} from "../../../../src/domain/workflows/collection-due-process/types";

interface ClassifyRequest {
  intake: CDPIntakeConfirmation;
  can_pay_full: boolean;
  can_pay_partial: boolean;
  payment_capability: number;
  financial_hardship: boolean;
  disputes_liability: boolean;
  has_prior_cdp: boolean;
  in_bankruptcy: boolean;
  bankruptcy_chapter?: "7" | "11" | "13";
  has_valid_defense: boolean;
  employer_status?: "employed" | "self-employed" | "retired";
}

interface ClassifyResponse {
  success: boolean;
  classification?: CDPClassificationResult;
  compliance?: {
    passed: boolean;
    warnings: string[];
    assumptions: string[];
    levy_risk_level: number;
    days_until_levy: number;
  };
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ClassifyResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ClassifyRequest;
    try {
      req = await readBody<ClassifyRequest>(event);
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
        statusMessage: "Missing intake data.",
      });
    }

    try {
      const request: CDPClassificationRequest = {
        intake: req.intake,
        can_pay_full: req.can_pay_full,
        can_pay_partial: req.can_pay_partial,
        payment_capability: req.payment_capability,
        financial_hardship: req.financial_hardship,
        disputes_liability: req.disputes_liability,
        has_prior_cdp: req.has_prior_cdp,
        in_bankruptcy: req.in_bankruptcy,
        bankruptcy_chapter: req.bankruptcy_chapter,
        has_valid_defense: req.has_valid_defense,
        employer_status: req.employer_status,
      };

      const classification = await classifyCDPResponse(request);
      const compliance = checkComplianceAfterClassification(
        req.intake.extraction,
        classification
      );

      return {
        success: true,
        classification,
        compliance: {
          passed: compliance.passed,
          warnings: compliance.warnings,
          assumptions: compliance.assumptions_flagged,
          levy_risk_level: compliance.levy_risk_level,
          days_until_levy: compliance.days_until_levy,
        },
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
