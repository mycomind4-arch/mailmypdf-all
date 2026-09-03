/**
 * POST /api/workflows/collection-due-process/extract
 * Extracts CDP notice data using multi-LLM extraction
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { extractCDPNotice } from "../../../../src/domain/workflows/collection-due-process/extraction";
import { validateExtractionQuality } from "../../../../src/domain/workflows/collection-due-process/guardrails";
import type { CDPNoticeExtraction } from "../../../../src/domain/workflows/collection-due-process/types";

interface ExtractRequest {
  noticeText: string;
  provider?: "claude" | "gemini" | "openai";
}

interface ExtractResponse {
  success: boolean;
  extraction?: CDPNoticeExtraction;
  validation?: { valid: boolean; errors: string[] };
  assumptions?: string[];
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ExtractResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ExtractRequest;
    try {
      req = await readBody<ExtractRequest>(event);
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body.",
      });
    }

    // Validate input
    if (!req.noticeText || req.noticeText.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Notice text is required.",
      });
    }

    try {
      const provider = req.provider || "claude";
      const extraction = await extractCDPNotice(req.noticeText, provider);

      // Validate extraction quality
      const validation = validateExtractionQuality(extraction);

      // Flag low-confidence assumptions
      const assumptions: string[] = [];
      if (extraction.deadline_confidence < 0.9) {
        assumptions.push(
          `[ASSUMPTION] Response deadline confidence is ${(extraction.deadline_confidence * 100).toFixed(0)}%. Verify: ${extraction.response_deadline}`
        );
      }
      if (extraction.tax_debt_confidence < 0.9) {
        assumptions.push(
          `[ASSUMPTION] Total tax debt confidence is ${(extraction.tax_debt_confidence * 100).toFixed(0)}%. Verify: $${extraction.total_tax_debt.toLocaleString()}`
        );
      }
      if (extraction.levy_confidence < 0.9) {
        assumptions.push(
          `[ASSUMPTION] Levy threats confidence is ${(extraction.levy_confidence * 100).toFixed(0)}%. Verify manually.`
        );
      }

      return {
        success: validation.valid,
        extraction,
        validation,
        assumptions: assumptions.length > 0 ? assumptions : undefined,
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
