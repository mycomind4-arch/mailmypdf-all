/**
 * POST /api/workflows/analyze
 *
 * Document analysis endpoint. Accepts a file upload (PDF, PNG, JPEG) or raw text,
 * sends it to the LLM for structured intelligence extraction.
 *
 * Request:
 *   multipart/form-data with:
 *     - document: File (PDF/PNG/JPEG) OR
 *     - text: string (raw text from already-extracted document)
 *     - workflowId: string (which workflow prompt to use)
 *
 * Response:
 *   { ok: true, analysis: {...}, provider: "gemini", workflow: "..." }
 */
import { createError, defineEventHandler, readBody, readMultipartFormData, type H3Event } from "h3";
import { callGeminiWithDocument, callLLM, getAvailableProviders } from "../../../src/platform/llm-service";
import { getWorkflowPrompt } from "../../../src/domain/workflow-prompts";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_MIMES = new Set(["application/pdf", "image/png", "image/jpeg"]);

function toMimeType(fileType: string): string | null {
  if (fileType === "application/pdf") return "application/pdf";
  if (fileType === "image/png") return "image/png";
  if (fileType === "image/jpeg" || fileType === "image/jpg") return "image/jpeg";
  return null;
}

export default defineEventHandler(async (event: H3Event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  }

  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw createError({
      statusCode: 503,
      statusMessage: "No LLM provider configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
    });
  }

  const contentType = event.headers.get("content-type") || "";

  let workflowId = "";
  let analysisText = "";

  if (contentType.includes("multipart/form-data")) {
    // File upload path — use Gemini multimodal
    const formData = await readMultipartFormData(event);
    if (!formData) {
      throw createError({ statusCode: 400, statusMessage: "Invalid form data." });
    }

    const wfField = formData.find(f => f.name === "workflowId");
    workflowId = wfField?.data?.toString("utf8") || "";

    const fileField = formData.find(f => f.name === "document" || f.name === "file");
    const textField = formData.find(f => f.name === "text");

    if (!workflowId) {
      throw createError({ statusCode: 400, statusMessage: "workflowId is required." });
    }

    if (fileField) {
      // ── File path: send to Gemini with inline document ──
      if (fileField.data.length === 0) {
        throw createError({ statusCode: 400, statusMessage: "The source document is empty." });
      }
      if (fileField.data.length > MAX_FILE_SIZE) {
        throw createError({ statusCode: 413, statusMessage: "Source documents must be 20 MB or smaller." });
      }

      const mimeType = toMimeType(fileField.type || "");
      if (!mimeType) {
        throw createError({ statusCode: 415, statusMessage: "Accepts PDF, PNG, and JPEG source documents." });
      }

      const prompt = getWorkflowPrompt(workflowId);
      const base64 = fileField.data.toString("base64");

      try {
        analysisText = await callGeminiWithDocument(prompt.analyze, base64, mimeType);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed.";
        throw createError({
          statusCode: message.includes("not configured") ? 503 : 502,
          statusMessage: message,
        });
      }
    } else if (textField) {
      // ── Text path: send to LLM as text ──
      analysisText = textField.data.toString("utf8");
      if (analysisText.length < 20) {
        throw createError({ statusCode: 400, statusMessage: "Document text is too short for analysis." });
      }
      const prompt = getWorkflowPrompt(workflowId);
      const response = await callLLM(
        [
          { role: "system", content: prompt.analyze },
          { role: "user", content: analysisText },
        ],
        { provider: "gemini", temperature: 0.1, maxTokens: 4096 },
      );
      analysisText = response.text;
    } else {
      throw createError({ statusCode: 400, statusMessage: "A source document or text is required." });
    }
  } else {
    // JSON body path — raw text analysis
    const body = await readBody<{ text?: string; workflowId?: string }>(event);
    workflowId = body?.workflowId || "";
    analysisText = body?.text || "";

    if (!workflowId) {
      throw createError({ statusCode: 400, statusMessage: "workflowId is required." });
    }
    if (analysisText.length < 20) {
      throw createError({ statusCode: 400, statusMessage: "Document text is too short for analysis." });
    }

    const prompt = getWorkflowPrompt(workflowId);
    const response = await callLLM(
      [
        { role: "system", content: prompt.analyze },
        { role: "user", content: analysisText },
      ],
      { provider: "gemini", temperature: 0.1, maxTokens: 4096 },
    );
    analysisText = response.text;
  }

  if (!analysisText) {
    throw createError({ statusCode: 502, statusMessage: "AI analysis returned no content." });
  }

  // Parse the JSON response (LLM should return strict JSON)
  let analysis: Record<string, unknown>;
  try {
    analysis = JSON.parse(analysisText);
  } catch {
    // If JSON parse fails, try to extract JSON from the text
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw createError({ statusCode: 502, statusMessage: "AI analysis did not return valid JSON." });
    }
  }

  return { ok: true, analysis, provider: "gemini", workflow: workflowId };
});
