/**
 * POST /api/workflows/eviction/classify
 * Classifies eviction situation and routes to appropriate response path
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { classifyEvictionResponse } from "../../../src/domain/workflows/eviction/classification";
import type {
  EvictionIntakeConfirmation,
  EvictionClassificationRequest,
  EvictionClassificationResult,
} from "../../../src/domain/workflows/eviction/types";

interface ClassifyEvictionRequest {
  intake: EvictionIntakeConfirmation;
  can_pay: boolean;
  payment_amount?: number;
  has_defenses: boolean;
  defense_types?: string[];
  tenant_status: "current" | "former" | "unauthorized";
  language_barrier?: boolean;
  prior_eviction?: boolean;
  court_involvement?: boolean;
}

interface ClassifyEvictionResponse {
  success: boolean;
  classification?: EvictionClassificationResult;
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ClassifyEvictionResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ClassifyEvictionRequest;
    try {
      req = await readBody<ClassifyEvictionRequest>(event);
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

    if (typeof req.can_pay !== "boolean") {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid can_pay field.",
      });
    }

    try {
      const classification = await classifyEvictionResponse({
        intake: req.intake,
        can_pay: req.can_pay,
        payment_amount: req.payment_amount,
        has_defenses: req.has_defenses,
        defense_types: req.defense_types,
        tenant_status: req.tenant_status,
        language_barrier: req.language_barrier,
        prior_eviction: req.prior_eviction,
        court_involvement: req.court_involvement,
      });

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
