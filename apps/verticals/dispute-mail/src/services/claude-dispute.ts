import { disputeAnalysisSchema, type DisputeAnalysis } from "@/domain/gold-standard";
import { getWorkflowPromptPack } from "@/domain/workflow-prompts";
import { validateWorkflowAnalysisCoverage } from "@/domain/workflow-analysis-validation";
import type { WorkflowId } from "@/domain/workflows";

interface ClaudeTextBlock { type: "text"; text: string }
interface ClaudeMessageResponse { content?: ClaudeTextBlock[] }

function getClaudeConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new Error("Claude analysis is not configured: ANTHROPIC_API_KEY and ANTHROPIC_MODEL are required");
  return { apiKey, model };
}

async function callClaude(system: string, userContent: string, maxTokens: number): Promise<string> {
  const { apiKey, model } = getClaudeConfig();
  if (userContent.length > 120_000) throw new Error("Claude workflow input exceeds the maximum supported document context");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!response.ok) throw new Error(`Claude request failed with status ${response.status}`);
  const payload = await response.json() as ClaudeMessageResponse;
  const text = payload.content?.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
  if (!text) throw new Error("Claude returned no text content");
  return text;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch { throw new Error("Claude returned invalid structured JSON"); }
}

export async function analyzeWithClaude(input: { workflowId: WorkflowId; documentId: string; text: string; facts?: Record<string, string | undefined>; objective?: string; evidenceStatuses?: Record<string, string> }): Promise<DisputeAnalysis> {
  const prompts = getWorkflowPromptPack(input.workflowId);
  const userContent = JSON.stringify({ documentId: input.documentId, sourceText: input.text, userFacts: input.facts ?? {}, objective: input.objective ?? "", evidenceStatuses: input.evidenceStatuses ?? {}, requiredOutput: { documentId: input.documentId, classification: { type: input.workflowId, confidence: "0..1" }, facts: "array", findings: "array", evidence: "array", strategy: "array", blockingIssues: "array" } });
  const text = await callClaude(`${prompts.analysisSystemPrompt}\n\nEvery required evidence item must use its deterministic evidence ID. Return ONLY one JSON object matching the required output shape.`, userContent, 6000);
  const analysis = disputeAnalysisSchema.parse(parseJsonObject(text));
  const coverageErrors = validateWorkflowAnalysisCoverage({ workflowId: input.workflowId, documentId: input.documentId, analysis });
  if (coverageErrors.length > 0) throw new Error(`Claude analysis coverage failed: ${coverageErrors.join("; ")}`);
  return analysis;
}

export async function draftWithClaude(input: { workflowId: WorkflowId; analysis: DisputeAnalysis }): Promise<string> {
  const prompts = getWorkflowPromptPack(input.workflowId);
  const userContent = JSON.stringify({ analysis: input.analysis, instruction: "Draft the complete correspondence. Return only the letter body; do not include analysis or markdown fences." });
  const draft = await callClaude(prompts.draftingSystemPrompt, userContent, 5000);
  if (!draft.trim()) throw new Error("Claude returned an empty draft");
  return draft;
}

export async function validateDraftWithClaude(input: { workflowId: WorkflowId; analysis: DisputeAnalysis; draft: string }): Promise<{ passed: boolean; issues: string[] }> {
  const prompts = getWorkflowPromptPack(input.workflowId);
  const userContent = JSON.stringify({ analysis: input.analysis, draft: input.draft, requiredOutput: { passed: "boolean", issues: "string[]" } });
  const text = await callClaude(`${prompts.validationSystemPrompt}\n\nReturn ONLY one JSON object with passed and issues. If any issue exists, passed MUST be false.`, userContent, 2500);
  const parsed = parseJsonObject(text) as { passed?: unknown; issues?: unknown };
  if (typeof parsed.passed !== "boolean" || !Array.isArray(parsed.issues) || !parsed.issues.every((issue) => typeof issue === "string")) throw new Error("Claude returned an invalid draft-validation response");
  const issues = parsed.issues as string[];
  if (parsed.passed && issues.length > 0) throw new Error("Claude returned passed=true with validation issues");
  return { passed: parsed.passed, issues };
}
