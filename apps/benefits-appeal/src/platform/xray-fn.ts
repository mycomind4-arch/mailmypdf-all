import { createServerFn } from "@tanstack/react-start";
import { runXRayAnalysis, type AnalyzedDocument, type XRayResult } from "@/domain/xray";
import type { Decision } from "@/domain/decision";
import type { Evidence } from "@/domain/evidence";
import { sanitizeExtractedText } from "@/lib/platform/documents";
import { RateLimiter, DEFAULT_RATE_LIMITS } from "@/lib/platform/intelligence";

/* ─────────────────────────────────────────────
   X-Ray Analysis Server Function
   Takes extracted text from all uploaded documents
   and runs the cross-document analysis engine.

   Upgraded with:
   - Content sanitization per document (prompt injection defense)
   - Rate limiting for expensive analysis operations
   ───────────────────────────────────────────── */

const xrayLimiter = new RateLimiter(DEFAULT_RATE_LIMITS.ai_operation);

export const analyzeDocuments = createServerFn()
  .validator((input: {
    documents: { id: string; name: string; text: string; isDecision: boolean; pageCount?: number }[];
    decision: Decision;
    evidence?: Evidence[];
    userId?: string;
  }) => {
    if (!input.documents || input.documents.length === 0) {
      throw new Error("At least one document is required for analysis");
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Rate limiting
    const rateKey = data.userId || "anonymous";
    const rateCheck = xrayLimiter.check(rateKey);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetMs / 1000)} seconds.`);
    }

    // Sanitize each document's text before analysis
    const analyzedDocs: AnalyzedDocument[] = data.documents.map((doc) => {
      const { text: cleanedText, warnings } = sanitizeExtractedText(doc.text);
      if (warnings.length > 0) {
        console.warn(`[SECURITY] Content sanitization warnings for document ${doc.name}:`, warnings);
      }
      return {
        id: doc.id,
        name: doc.name,
        text: cleanedText,
        pageCount: doc.pageCount || Math.max(1, Math.ceil(cleanedText.length / 3000)),
        isDecision: doc.isDecision,
      };
    });

    const result = runXRayAnalysis(
      analyzedDocs,
      data.decision,
      data.evidence || [],
    );

    return result;
  });
