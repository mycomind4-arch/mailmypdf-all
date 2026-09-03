/**
 * POST /api/workflows/cp2000/extract
 * Extracts structured data from uploaded CP2000 notice
 */

import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { extractCP2000Notice } from "../../../../src/domain/workflows/cp2000/extraction";
import type { CP2000NoticeExtraction } from "../../../../src/domain/workflows/cp2000/types";

interface ExtractCP2000Request {
  noticeText: string;
  provider?: "claude" | "gemini" | "openai";
}

interface ExtractCP2000Response {
  success: boolean;
  extraction?: CP2000NoticeExtraction;
  error?: string;
  code?: string;
  provider?: string;
  model?: string;
}

export default defineEventHandler(async (event: H3Event): Promise<ExtractCP2000Response> => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }

  let req: ExtractCP2000Request;
  try {
    req = await readBody<ExtractCP2000Request>(event);
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
    const extraction = await extractCP2000Notice(req.noticeText, req.provider);

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
