import { createFileRoute } from "@tanstack/react-router";
import { getWorkflow } from "@/domain/workflows";
import { requireAuthenticatedUser } from "@/platform/supabase";
import { callAIText, resolveAI } from "@/platform/control-plane-ai";

export const Route = createFileRoute("/api/workflows/$workflowId/draft")({ server: { handlers: { POST: async ({ request, params }) => { try {
  await requireAuthenticatedUser(request); const workflow = getWorkflow(params.workflowId); const payload = await request.json() as { analysis?: unknown }; if (!payload.analysis) return Response.json({ error: "Analysis results are required." }, { status: 400 });
  const draftConfig = await resolveAI(params.workflowId, "draft"); const validationConfig = await resolveAI(params.workflowId, "validation");
  const draft = await callAIText(draftConfig, "Write a professional response that a human can review and edit. Use only supplied facts and preserve uncertainty.", draftConfig.promptOverride || [`Create the response for workflow: ${workflow.title}.`, workflow.workflowPrompt, `Focus on: ${workflow.focusAreas.join(", ")}.`, "Use only supplied facts. Do not invent policy, law, facts, dates, amounts, diagnoses, deadlines, or outcomes.", `CASE ANALYSIS:\n${JSON.stringify(payload.analysis)}`].join("\n\n"));
  const validation = await callAIText(validationConfig, "Audit the draft for unsupported claims, missing evidence, contradictions, deadline issues, fabricated authority, and factual uncertainty. Return strict JSON.", validationConfig.promptOverride || [`Audit this draft for the workflow: ${workflow.title}.`, 'Return strict JSON: {"valid":boolean,"issues":string[],"unsupportedClaims":string[],"missingEvidence":string[],"suggestions":string[]}.', `ANALYSIS:\n${JSON.stringify(payload.analysis)}`, `DRAFT:\n${draft}`].join("\n\n"), true);
  return Response.json({ ok: true, workflowId: workflow.id, draft, validation, provider: draftConfig.provider, draftModel: draftConfig.model, validationModel: validationConfig.model });
} catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to create response." }, { status: 502 }); } } } } });
