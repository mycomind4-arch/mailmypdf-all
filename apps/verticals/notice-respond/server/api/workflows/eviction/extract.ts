/**
 * POST /api/workflows/eviction/extract
 * Extracts structured data from uploaded eviction notice
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { extractEvictionNotice } from "../../../src/domain/workflows/eviction/extraction";
import type { EvictionNoticeExtraction } from "../../../src/domain/workflows/eviction/types";

interface ExtractEvictionRequest {
  noticeText: string;
  provider?: "claude" | "gemini" | "openai";
}

interface ExtractEvictionResponse {
  success: boolean;
  extraction?: EvictionNoticeExtraction;
  error?: string;
  code?: string;
  provider?: string;
  model?: string;
}

export default defineEventHandler(async (event: H3Event): Promise<ExtractEvictionResponse> => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }

  let req: ExtractEvictionRequest;
  try {
    req = await readBody<ExtractEvictionRequest>(event);
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
    const extraction = await extractEvictionNotice(req.noticeText);

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
});
