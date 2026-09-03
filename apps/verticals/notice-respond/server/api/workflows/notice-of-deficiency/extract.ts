/**
 * POST /api/workflows/notice-of-deficiency/extract
 * Extracts structured data from Notice of Deficiency
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { extractDeficiencyNotice } from "../../../../src/domain/workflows/notice-of-deficiency/extraction";
import type { NoticeOfDeficiencyExtraction } from "../../../../src/domain/workflows/notice-of-deficiency/types";

interface ExtractDeficiencyRequest {
  noticeText: string;
  provider?: "claude" | "gemini" | "openai";
}

interface ExtractDeficiencyResponse {
  success: boolean;
  extraction?: NoticeOfDeficiencyExtraction;
  error?: string;
  code?: string;
  provider?: string;
  model?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ExtractDeficiencyResponse> => {
    if (event.method !== "POST") {
      throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    let req: ExtractDeficiencyRequest;
    try {
      req = await readBody<ExtractDeficiencyRequest>(event);
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body. Expected JSON with noticeText.",
      });
    }

    if (!req.noticeText || typeof req.noticeText !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid noticeText field.",
      });
    }

    try {
      const extraction = await extractDeficiencyNotice(req.noticeText, req.provider);

      return {
        success: true,
        extraction,
        provider: "claude",
        model: "claude-opus-5",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: message,
        code: "EXTRACTION_FAILED",
      };
    }
  }
);
