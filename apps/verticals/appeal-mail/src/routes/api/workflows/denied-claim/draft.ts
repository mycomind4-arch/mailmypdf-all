import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { validateAppealDraft } from "@/domain/draft-validator";
import { callAIText, resolveAI } from "@/platform/control-plane-ai";

export const Route = createFileRoute("/api/workflows/denied-claim/draft")({
  server: {
    handlers: {
        POST: async ({ request }) => {
    try {
      const user = await requireAuthenticatedUser(request);
      const payload = await request.json() as { appealId?: string; extracted?: any; analysis?: unknown };
      if (!payload.appealId?.trim()) return Response.json({ error: "Appeal id is required." }, { status: 400 });
      if (!payload.extracted || !payload.analysis) return Response.json({ error: "Analysis results are required." }, { status: 400 });

      const supabase = await getSupabaseServer();
      const { data: existing, error: loadError } = await supabase.from("appeals").select("id,user_id,workflow_id,version,decision").eq("id", payload.appealId).single();
      if (loadError || !existing) return Response.json({ error: "Appeal case not found." }, { status: 404 });
      if (existing.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
      if (existing.workflow_id !== "denied-claim") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });

      const draftConfig = await resolveAI("denied-claim", "draft");
      const validationConfig = await resolveAI("denied-claim", "validation");
      const draft = await callAIText(draftConfig, "Draft a persuasive, factual appeal response from the supplied case analysis. Distinguish established facts from arguments. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Return only the response letter.", JSON.stringify({ extracted: payload.extracted, analysis: payload.analysis }));
      const validation = await callAIText(validationConfig, "Audit this appeal draft against the supplied analysis. Identify unsupported facts, missing evidence, contradictions, deadline problems, tone problems, and material defects. Return concise JSON with valid:boolean, issues:string[], suggestions:string[].", JSON.stringify({ analysis: payload.analysis, draft }), true);

      const evidenceId = crypto.randomUUID();
      const evidence = [{
        id: evidenceId,
        type: "document",
        label: payload.extracted?.issuer ? `${payload.extracted.issuer} denial` : "Denial document",
        documentId: existing.decision?.documentId,
        documentFilename: existing.decision?.documentFilename,
        groundIds: [] as string[],
        uploadedAt: new Date().toISOString(),
        notes: "Source document supplied for AI analysis.",
      }];
      const rawIssues = Array.isArray(payload.extracted?.issues) ? payload.extracted.issues : [];
      const reasonItems = Array.isArray(payload.extracted?.denialReasons) ? payload.extracted.denialReasons : [];
      const groundSource = String(reasonItems[0] || payload.extracted?.summary || "The denial should be reconsidered based on the documented facts.");
      const groundId = crypto.randomUUID();
      const grounds = [{
        id: groundId,
        type: "factual_error",
        claim: groundSource,
        source: groundSource,
        supportingEvidenceIds: [evidenceId],
        confidence: 0.65,
        userConfirmed: false,
        draftLanguage: "",
      }];
      evidence[0].groundIds = [groundId];

      const draftValidation = validateAppealDraft(draft, existing.decision || ({} as any), grounds, evidence);
      const blockingFindings = draftValidation.findings.filter((f) => (f.severity === "block" || f.severity === "error") && !f.passed);
      if (blockingFindings.length > 0) return Response.json({ error: "Draft failed validation.", draftValidation, blockingFindings }, { status: 422 });
      const nextVersion = (existing.version ?? 1) + 1;
      const { error: updateError } = await supabase
        .from("appeals")
        .update({ draft, grounds, evidence, arguments: [], version: nextVersion, updated_at: new Date().toISOString() })
        .eq("id", payload.appealId)
        .eq("user_id", user.id)
        .eq("version", existing.version ?? 1);
      if (updateError) throw new Error(`Unable to save appeal draft: ${updateError.message}`);

      return Response.json({ ok: true, appealId: payload.appealId, draft, validation, draftValidation, draftProvider: draftConfig.provider, validationProvider: validationConfig.provider, groundsCount: grounds.length, evidenceCount: evidence.length, issueCount: rawIssues.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create appeal draft.";
      const status = /authentication|required|token/i.test(message) ? 401 : 502;
      return Response.json({ error: message }, { status });
    }
      },
    },
  },
});
