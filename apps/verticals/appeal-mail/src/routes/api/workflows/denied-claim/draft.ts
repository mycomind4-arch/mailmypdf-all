import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { validateAppealDraft } from "@/domain/draft-validator";

type ProviderConfig = { provider: "anthropic" | "openai" | "gemini"; apiKey: string; apiBaseUrl?: string | null; model: string; promptOverride?: string | null };

async function resolveProvider(task: "draft" | "validation") {
  const base = process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.ai";
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!token) throw new Error("MailMyPDF control-plane token is not configured.");
  const response = await fetch(`${base.replace(/\/$/, "")}/api/control-plane/ai`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ verticalSlug: "appeal-mail", workflowSlug: "denied-claim", task }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Control plane error (${response.status}).`);
  return payload as ProviderConfig;
}

async function callGemini(config: ProviderConfig, system: string, user: string) {
  if (config.provider !== "gemini") throw new Error(`Denied Claim currently requires Gemini; control plane returned ${config.provider}.`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${config.promptOverride || system}\n\n${user}` }] }], generationConfig: { temperature: 0.2 } }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `Gemini request failed (${response.status}).`);
  const text = body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no response.");
  return text;
}

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

      const draftConfig = await resolveProvider("draft");
      const validationConfig = await resolveProvider("validation");
      const draft = await callGemini(draftConfig, "Draft a persuasive, factual appeal response from the supplied case analysis. Distinguish established facts from arguments. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Return only the response letter.", JSON.stringify({ extracted: payload.extracted, analysis: payload.analysis }));
      const validation = await callGemini(validationConfig, "Audit this appeal draft against the supplied analysis. Identify unsupported facts, missing evidence, contradictions, deadline problems, tone problems, and material defects. Return concise JSON with valid:boolean, issues:string[], suggestions:string[].", JSON.stringify({ analysis: payload.analysis, draft }));

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