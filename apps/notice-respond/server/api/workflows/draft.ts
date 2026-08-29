/**
 * POST /api/workflows/draft
 *
 * Draft generation endpoint. Takes analysis results + user facts + objective,
 * generates a response letter using the LLM, then runs deterministic validation.
 *
 * Request:
 *   { workflowId, analysis, userFacts, userObjective, documentText, provider? }
 *
 * Response:
 *   { ok: true, draft: "...", validation: {...}, provider: "gemini" }
 */
import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { callLLM, getAvailableProviders, type LLMProvider } from "../../../src/platform/llm-service";
import { getWorkflowPrompt } from "../../../src/domain/workflow-prompts";
import { validateDraft } from "../../../src/domain/draft-validator";

interface DraftRequestBody {
  workflowId?: string;
  analysis?: Record<string, unknown>;
  userFacts?: string;
  userObjective?: string;
  documentText?: string;
  provider?: LLMProvider;
}

export default defineEventHandler(async (event: H3Event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  }

  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw createError({
      statusCode: 503,
      statusMessage: "No LLM provider configured.",
    });
  }

  const body = await readBody<DraftRequestBody>(event);
  const workflowId = body?.workflowId;
  const analysis = body?.analysis;
  const userFacts = body?.userFacts || "";
  const userObjective = body?.userObjective || "";
  const documentText = body?.documentText || "";
  const provider = (body?.provider as LLMProvider) || "gemini";

  if (!workflowId) {
    throw createError({ statusCode: 400, statusMessage: "workflowId is required." });
  }
  if (!analysis) {
    throw createError({ statusCode: 400, statusMessage: "Analysis results are required to generate a draft." });
  }

  const prompt = getWorkflowPrompt(workflowId);

  // Build the user message with all available context
  const contextParts: string[] = [];

  contextParts.push("=== DOCUMENT ANALYSIS ===");
  contextParts.push(JSON.stringify(analysis, null, 2));

  if (documentText) {
    contextParts.push("\n=== SOURCE DOCUMENT TEXT ===");
    contextParts.push(documentText.substring(0, 8000)); // Cap to avoid token overflow
  }

  if (userFacts) {
    contextParts.push("\n=== USER FACTS ===");
    contextParts.push(userFacts);
  }

  if (userObjective) {
    contextParts.push("\n=== USER OBJECTIVE ===");
    contextParts.push(userObjective);
  }

  contextParts.push("\n=== INSTRUCTIONS ===");
  contextParts.push("Generate a complete response letter based on the analysis above.");
  contextParts.push("Use the user's facts and objective to shape the response.");
  contextParts.push("Return ONLY the letter text — no JSON, no markdown, no commentary.");
  contextParts.push("The letter should be ready to review and mail.");

  const userMessage = contextParts.join("\n");

  let draftText: string;
  let usedProvider: LLMProvider;

  try {
    const response = await callLLM(
      [
        { role: "system", content: prompt.draft },
        { role: "user", content: userMessage },
      ],
      { provider, temperature: 0.4, maxTokens: 4096 },
    );
    draftText = response.text;
    usedProvider = response.provider;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed.";
    throw createError({
      statusCode: message.includes("not configured") ? 503 : 500,
      statusMessage: message,
    });
  }

  if (!draftText) {
    throw createError({ statusCode: 502, statusMessage: "AI draft generation returned no content." });
  }

  // Run deterministic validation on the LLM-generated draft
  const validation = validateDraft({
    draft: draftText,
    facts: [], // Facts come from analysis, not the generic validator
    requirements: [],
    forbiddenBehavior: [],
    sections: [],
  });

  return {
    ok: true,
    draft: draftText,
    validation,
    provider: usedProvider,
    workflow: workflowId,
  };
});
