import { createServerFn } from "@tanstack/react-start";
import { extractFromText, applyExtraction } from "@/platform/document-extraction";
import type { Decision } from "@/domain/decision";
import { sanitizeExtractedText } from "@/lib/platform/documents";
import { RateLimiter, DEFAULT_RATE_LIMITS } from "@/lib/platform/intelligence";

/* ─────────────────────────────────────────────
   Server function: extract decision data from
   document text. Client-side PDF/text extraction
   feeds this server-side pattern matching engine.

   Upgraded with:
   - Content sanitization (prompt injection defense)
   - Rate limiting
   ───────────────────────────────────────────── */

// Server-side rate limiter for extraction operations
const extractionLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.document_processing);

export const extractDecision = createServerFn()
  .validator((input: { text: string; decision: Decision; userId?: string }) => {
    if (!input.text || typeof input.text !== "string") {
      throw new Error("Text input is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Rate limiting
    const rateKey = data.userId || "anonymous";
    const rateCheck = extractionLimiter.check(rateKey);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetMs / 1000)} seconds.`);
    }

    const { text, decision } = data;

    // Sanitize extracted text for AI safety (prompt injection defense)
    const { text: cleanedText, warnings } = sanitizeExtractedText(text);

    // Log warnings if any injection patterns detected
    if (warnings.length > 0) {
      console.warn(`[SECURITY] Content sanitization warnings for extraction:`, warnings);
    }

    const result = extractFromText(cleanedText);
    const updated = applyExtraction(decision, result);

    return {
      decision: updated,
      extraction: result,
      confidence: result.extractionConfidence,
      securityWarnings: warnings,
      fieldsExtracted: [
        result.agency && "agency",
        result.referenceNumber && "referenceNumber",
        result.decisionDate && "decisionDate",
        result.deadline?.date && "deadline",
        result.decisionTypeLabel && "decisionType",
        result.appealInstructions && "appealInstructions",
        result.reasons.length > 0 && "reasons",
        result.chronology.length > 0 && "timeline",
      ].filter(Boolean) as string[],
    };
  });
