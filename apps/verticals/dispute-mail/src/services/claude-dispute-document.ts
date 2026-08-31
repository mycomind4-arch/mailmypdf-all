import { disputeAnalysisSchema, type DisputeAnalysis } from "@/domain/gold-standard";
import { getWorkflowPromptPack } from "@/domain/workflow-prompts";
import type { WorkflowId } from "@/domain/workflows";

interface ClaudeTextBlock { type: "text"; text: string }
interface ClaudeMessageResponse { content?: Array<ClaudeTextBlock | { type: string; [key: string]: unknown }> }

function config() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new Error("Claude analysis is not configured: ANTHROPIC_API_KEY and ANTHROPIC_MODEL are required");
  return { apiKey, model };
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch { throw new Error("Claude returned invalid structured JSON"); }
}

export async function analyzeWithClaudeDocument(input: {
  workflowId: WorkflowId;
  documentId: string;
  filename: string;
  pdfBase64: string;
  facts?: Record<string, string | undefined>;
  objective?: string;
  evidenceStatuses?: Record<string, string>;
}): Promise<DisputeAnalysis> {
  const { apiKey, model } = config();
  const prompts = getWorkflowPromptPack(input.workflowId);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 7000,
      system: `${prompts.analysisSystemPrompt}\n\nThe supplied PDF is the source document. Extract and cite only what is actually supported by the document. Return ONLY one JSON object matching the required output shape. The documentId must exactly match the supplied documentId. The classification.type must exactly match the supplied workflowId. Evidence must account for every evidence requirement relevant to the workflow. Do not treat user-provided evidence statuses as proof that evidence exists; use them as review-state context only.`,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 },
            title: input.filename,
            context: JSON.stringify({ documentId: input.documentId, workflowId: input.workflowId, userFacts: input.facts ?? {}, objective: input.objective ?? "", evidenceStatuses: input.evidenceStatuses ?? {} }),
          },
          {
            type: "text",
            text: JSON.stringify({ documentId: input.documentId, workflowId: input.workflowId, userFacts: input.facts ?? {}, objective: input.objective ?? "", evidenceStatuses: input.evidenceStatuses ?? {}, requiredOutput: { documentId: input.documentId, classification: { type: input.workflowId, confidence: "0..1" }, facts: "array", findings: "array", evidence: "array", strategy: "array", blockingIssues: "array" } }),
          },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`Claude PDF analysis failed with status ${response.status}`);
  const payload = await response.json() as ClaudeMessageResponse;
  const text = payload.content?.filter((block): block is ClaudeTextBlock => block.type === "text").map((block) => block.text).join("\n").trim();
  if (!text) throw new Error("Claude returned no analysis text for the uploaded document");
  return disputeAnalysisSchema.parse(parseJsonObject(text));
}

// Re-export for compatibility — these live in claude-dispute.ts
export { draftWithClaude, validateDraftWithClaude } from "./claude-dispute";
