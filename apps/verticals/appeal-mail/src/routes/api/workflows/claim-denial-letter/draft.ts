import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { getWorkflow } from "@/domain/workflows";
import { validateAppealDraft } from "@/domain/draft-validator";
import { callAIText, resolveAI } from "@/platform/control-plane-ai";

export const Route = createFileRoute("/api/workflows/claim-denial-letter/draft")({
  server: {
    handlers: {
        POST: async ({ request }) => {
    try {
      const user = await requireAuthenticatedUser(request);
      const input = await request.json() as { appealId?: string; analysis?: unknown; draftOverride?: string };
      if (!input.appealId?.trim()) return Response.json({ error: "Appeal id is required." }, { status: 400 });
      const supabase = await getSupabaseServer();
      const { data: appeal, error } = await supabase.from("appeals").select("*").eq("id", input.appealId).single();
      if (error || !appeal) return Response.json({ error: "Appeal case not found." }, { status: 404 });
      if (appeal.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
      if (appeal.workflow_id !== "claim-denial-letter") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });
      const workflow = getWorkflow("claim-denial-letter");
      const draftConfig = await resolveAI("claim-denial-letter", "draft"); const validationConfig = await resolveAI("claim-denial-letter", "validation");
      const analysis = input.analysis || appeal.decision;
      const draft = input.draftOverride?.trim() || await callAIText(draftConfig, "Draft only from verified case facts. Do not invent law, policy language, facts, dates, amounts, deadlines, or outcomes. Return only the response letter.", [`Create a response for the workflow: ${workflow.title}.`, workflow.workflowPrompt, `Focus on: ${workflow.focusAreas.join(", ")}.`, `CASE ANALYSIS:\n${JSON.stringify(analysis)}`].join("\n\n"));
      const validation = await callAIText(validationConfig, "Audit this claim-denial response. Return strict JSON with valid, issues, unsupportedClaims, missingEvidence, suggestions. Flag unsupported claims, invented authority, missing evidence, contradictions, deadline problems, and factual uncertainty.", [`CASE ANALYSIS:\n${JSON.stringify(analysis)}`, `DRAFT:\n${draft}`].join("\n\n"), true);
      const finalDraft = `${draft}\n\nSincerely,\n[Your Name]`;
      const draftValidation = validateAppealDraft(draft, appeal.decision || ({} as any), Array.isArray(appeal.grounds) ? appeal.grounds : [], Array.isArray(appeal.evidence) ? appeal.evidence : []);
      const blockingFindings = draftValidation.findings.filter((f) => (f.severity === "block" || f.severity === "error") && !f.passed);
      if (blockingFindings.length > 0) return Response.json({ error: "Draft failed validation.", draftValidation, blockingFindings }, { status: 422 });
      const currentVersion = appeal.version ?? 1;
      const { error: updateError } = await supabase.from("appeals").update({ draft: finalDraft, status: "in_progress", version: currentVersion + 1, updated_at: new Date().toISOString() }).eq("id", appeal.id).eq("user_id", user.id).eq("version", currentVersion);
      if (updateError) throw new Error(`Unable to persist draft: ${updateError.message}`);
      return Response.json({ ok: true, appealId: appeal.id, draft: finalDraft, validation, draftValidation, draftProvider: draftConfig.provider, draftModel: draftConfig.model, validationProvider: validationConfig.provider, validationModel: validationConfig.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create claim-denial response.";
      return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
    }
      },
    },
  },
});
