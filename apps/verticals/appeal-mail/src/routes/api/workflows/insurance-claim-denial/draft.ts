import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { getWorkflow } from "@/domain/workflows";
import { validateAppealDraft } from "@/domain/draft-validator";
import { callAIText, resolveAI } from "@/platform/control-plane-ai";

export const Route = createFileRoute("/api/workflows/insurance-claim-denial/draft")({
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
      if (appeal.workflow_id !== "insurance-claim-denial") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });

      const workflow = getWorkflow("insurance-claim-denial");
      const draftConfig = await resolveAI("insurance-claim-denial", "draft");
      const validationConfig = await resolveAI("insurance-claim-denial", "validation");
      const analysis = input.analysis || appeal.decision;
      const draft = input.draftOverride?.trim() || await callAIText(draftConfig, "Draft only from verified case facts. Do not invent policy language, law, facts, dates, amounts, deadlines, medical facts, or outcomes. Return only the response letter.", [
        `Create a response for the workflow: ${workflow.title}.`, workflow.workflowPrompt,
        `Focus on: ${workflow.focusAreas.join(", ")}.`,
        "Use only the supplied facts. Do not invent policy language, law, facts, dates, amounts, deadlines, medical facts, or outcomes.",
        "Write a professional insurance claim appeal that a human can review and edit.",
        "End with the exact placeholder [Your Name] on its own line so the customer can complete the signature.",
        `CASE ANALYSIS:\n${JSON.stringify(analysis)}`,
      ].join("\n\n"));
      const validation = await callAIText(validationConfig, "Audit this insurance claim appeal draft. Return strict JSON with valid, issues, unsupportedClaims, missingEvidence, suggestions. Flag unsupported claims, fabricated policy/legal language, missing evidence, contradictions, deadline problems, and factual uncertainty.", [
        `Audit this insurance claim appeal draft for: ${workflow.title}.`,
        "Return strict JSON with valid, issues, unsupportedClaims, missingEvidence, suggestions.",
        "Flag unsupported claims, fabricated policy/legal language, missing evidence, contradictions, deadline problems, and factual uncertainty.",
        `CASE ANALYSIS:\n${JSON.stringify(analysis)}`,
        `DRAFT:\n${draft}`,
      ].join("\n\n"), true);

      const draftValidation = validateAppealDraft(draft, appeal.decision || ({} as any), Array.isArray(appeal.grounds) ? appeal.grounds : [], Array.isArray(appeal.evidence) ? appeal.evidence : []);
      const blockingFindings = draftValidation.findings.filter((f) => (f.severity === "block" || f.severity === "error") && !f.passed);
      if (blockingFindings.length > 0) return Response.json({ error: "Draft failed validation.", draftValidation, blockingFindings }, { status: 422 });
      const currentVersion = appeal.version ?? 1;
      const { error: updateError } = await supabase.from("appeals").update({ draft, status: "in_progress", version: currentVersion + 1, updated_at: new Date().toISOString() }).eq("id", appeal.id).eq("user_id", user.id).eq("version", currentVersion);
      if (updateError) throw new Error(`Unable to persist draft: ${updateError.message}`);

      return Response.json({ ok: true, appealId: appeal.id, draft, validation, draftValidation, draftProvider: draftConfig.provider, draftModel: draftConfig.model, validationProvider: validationConfig.provider, validationModel: validationConfig.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create response.";
      return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
    }
      },
    },
  },
});
