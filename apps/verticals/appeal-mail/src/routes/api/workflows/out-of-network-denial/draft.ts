import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { getWorkflow } from "@/domain/workflows";
import { validateAppealDraft } from "@/domain/draft-validator";

async function resolveGemini(task: "draft" | "validation") {
  const base = process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.com";
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!token) throw new Error("MailMyPDF control-plane token is not configured.");
  const response = await fetch(`${base.replace(/\/$/, "")}/api/control-plane/ai`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ verticalSlug: "appeal-mail", workflowSlug: "out-of-network-denial", task }) });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || !payload?.apiKey || !payload?.model || payload.provider !== "gemini") throw new Error("Gemini configuration is unavailable for this workflow.");
  return payload;
}
async function callGemini(config: any, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: config.promptOverride || prompt }] }], generationConfig: { temperature: 0.2 } }) });
  const body = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(body?.error?.message || `Gemini request failed (${response.status}).`);
  const text = body?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no response.");
  return text;
}
export const Route = createFileRoute("/api/workflows/out-of-network-denial/draft")({server:{handlers:{ POST: async ({ request }) => {
  try {
    const user = await requireAuthenticatedUser(request);
    const input = await request.json() as { appealId?: string; analysis?: unknown; draftOverride?: string };
    if (!input.appealId?.trim()) return Response.json({ error: "Appeal id is required." }, { status: 400 });
    const supabase = await getSupabaseServer();
    const { data: appeal, error } = await supabase.from("appeals").select("*").eq("id", input.appealId).single();
    if (error || !appeal) return Response.json({ error: "Appeal case not found." }, { status: 404 });
    if (appeal.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
    if (appeal.workflow_id !== "out-of-network-denial") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });
    const workflow = getWorkflow("out-of-network-denial");
    const draftConfig = await resolveGemini("draft"); const validationConfig = await resolveGemini("validation");
    const analysis = input.analysis || appeal.decision;
    const draft = input.draftOverride?.trim() || await callGemini(draftConfig, [
      `Create a response for ${workflow.title}.`, workflow.workflowPrompt, `Focus on: ${workflow.focusAreas.join(", ")}.`,
      "Use only supplied facts. Do not invent plan provisions, network status, exceptions, legal authority, medical facts, deadlines, or outcomes.",
      "Write a professional out-of-network appeal that a human can review and edit.", `CASE ANALYSIS:\n${JSON.stringify(analysis)}`,
    ].join("\n\n"));
    const validation = await callGemini(validationConfig, [
      `Audit this ${workflow.title} draft.`, "Return strict JSON with valid, issues, unsupportedClaims, missingEvidence, suggestions.",
      "Flag invented plan language, unsupported network/exception claims, missing records, contradictions, deadline problems, and uncertainty.",
      `CASE ANALYSIS:\n${JSON.stringify(analysis)}`, `DRAFT:\n${draft}`,
    ].join("\n\n"));
    const draftValidation = validateAppealDraft(draft, appeal.decision || ({} as any), Array.isArray(appeal.grounds) ? appeal.grounds : [], Array.isArray(appeal.evidence) ? appeal.evidence : []);
      const blockingFindings = draftValidation.findings.filter((f) => (f.severity === "block" || f.severity === "error") && !f.passed);
      if (blockingFindings.length > 0) return Response.json({ error: "Draft failed validation.", draftValidation, blockingFindings }, { status: 422 });
      const persisted = `${draft}\n\nSincerely,\n[Your Name]`; const version = appeal.version ?? 1;
    const { error: updateError } = await supabase.from("appeals").update({ draft: persisted, status: "in_progress", version: version + 1, updated_at: new Date().toISOString() }).eq("id", appeal.id).eq("user_id", user.id).eq("version", version);
    if (updateError) throw new Error(`Unable to persist draft: ${updateError.message}`);
    return Response.json({ ok: true, appealId: appeal.id, draft: persisted, validation, draftValidation, provider: "gemini", draftModel: draftConfig.model, validationModel: validationConfig.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create out-of-network appeal response.";
    return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
  }
} }}});