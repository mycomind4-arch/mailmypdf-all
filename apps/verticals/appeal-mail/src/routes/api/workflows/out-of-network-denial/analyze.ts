import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { uploadDocument } from "@/platform/mailmypdf";
import { createDecision } from "@/domain/decision";
import { createAppeal } from "@/domain/appeal";
import { createGround } from "@/domain/ground";
import { createEvidence } from "@/domain/evidence";
import { getWorkflow } from "@/domain/workflows";

function mediaType(file: File): "application/pdf" | "image/png" | "image/jpeg" {
  if (file.type === "application/pdf" || file.type === "image/png" || file.type === "image/jpeg") return file.type;
  throw new Error("Please upload a PDF, PNG, or JPEG document.");
}

async function resolveGemini() {
  const base = process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.ai";
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!token) throw new Error("MailMyPDF control-plane token is not configured.");
  const response = await fetch(`${base.replace(/\/$/, "")}/api/control-plane/ai`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ verticalSlug: "appeal-mail", workflowSlug: "out-of-network-denial", task: "analysis" }),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || !payload?.apiKey || !payload?.model || payload.provider !== "gemini") {
    throw new Error("Gemini configuration is unavailable for this workflow.");
  }
  return payload;
}

export const Route = createFileRoute("/api/workflows/out-of-network-denial/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
    try {
      const user = await requireAuthenticatedUser(request);
      const workflow = getWorkflow("out-of-network-denial");
      const form = await request.formData();
      const file = form.get("document");
      if (!(file instanceof File)) return Response.json({ error: "An out-of-network denial is required." }, { status: 400 });
      if (!file.size) return Response.json({ error: "The source document is empty." }, { status: 400 });
      if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Source documents must be 20 MB or smaller." }, { status: 413 });

      const document = await uploadDocument(file);
      const gemini = await resolveGemini();
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      const prompt = [
        `Workflow: ${workflow.title}`,
        workflow.description,
        workflow.workflowPrompt,
        `Focus areas: ${workflow.focusAreas.join(", ")}.`,
        "Analyze the actual out-of-network denial. Extract only supported facts and distinguish payer statements from policy language and user-provided evidence.",
        "Identify network status, service/provider details, plan terms or exceptions mentioned, denial rationale, continuity/emergency or access issues if stated, records referenced, appeal instructions, and deadline.",
        "Do not invent plan provisions, legal authority, medical necessity, or exception eligibility.",
        "Return strict JSON only.",
        '{"summary":"","decision":"","decisionType":"out_of_network_denial","issuer":"","referenceNumber":"","decisionDate":"","deadline":"","service":"","provider":"","networkFinding":"","denialReasons":[],"planTermsMentioned":[],"exceptionsMentioned":[],"evidenceMentioned":[],"issues":[{"issue":"","whyItMatters":"","evidenceNeeded":[]}],"uncertainties":[],"confidence":"high|medium|low"}'
      ].join("\n\n");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(gemini.model)}:generateContent?key=${encodeURIComponent(gemini.apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType(file), data } }, { text: gemini.promptOverride || prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }),
      });
      const body = await response.json().catch(() => null) as any;
      if (!response.ok) throw new Error(body?.error?.message || `Gemini analysis failed (${response.status}).`);
      const text = body?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("").trim();
      if (!text) throw new Error("Gemini returned no analysis.");
      const analysis = JSON.parse(text) as any;

      const decision = createDecision("claim_denial", {
        id: crypto.randomUUID(), documentId: document.id, documentFilename: document.filename,
        agency: analysis.issuer || undefined, referenceNumber: analysis.referenceNumber || undefined,
        decisionDate: analysis.decisionDate || undefined, decisionTypeLabel: analysis.decision || "Out-of-network denial",
        deadline: analysis.deadline ? { date: analysis.deadline, type: "appeal", source: "extracted" } : undefined,
        facts: [analysis.service, analysis.provider, analysis.networkFinding, ...(analysis.planTermsMentioned || []), ...(analysis.exceptionsMentioned || [])].filter(Boolean).map((value: string, i: number) => ({ id: `${i}-${crypto.randomUUID()}`, label: `Fact ${i + 1}`, value, source: "extracted", confidence: 0.8 })),
        reasons: (analysis.denialReasons || []).map((text: string, i: number) => ({ id: `${i}-${crypto.randomUUID()}`, text, confidence: 0.9 })),
        issues: (analysis.issues || []).map((item: any, i: number) => ({ id: `${i}-${crypto.randomUUID()}`, description: item.issue || "Out-of-network issue", type: "factual_dispute", severity: "medium", sourceExcerpt: item.whyItMatters })),
        rawText: JSON.stringify(analysis), extractedAt: new Date().toISOString(), extractionConfidence: analysis.confidence === "high" ? 0.9 : analysis.confidence === "medium" ? 0.7 : 0.5,
      });
      const grounds = (analysis.issues || []).map((item: any, i: number) => createGround("factual_error", {
        id: `ground-${i}-${crypto.randomUUID()}`, claim: item.issue || "Review an out-of-network finding",
        source: item.whyItMatters || "Identified by document analysis", confidence: 0.65,
        unresolvedIssue: (item.evidenceNeeded || []).join(", "),
      }));
      const evidence = (analysis.evidenceMentioned || []).map((label: string) => createEvidence("document", label, { documentId: document.id, documentFilename: document.filename, uploadedAt: new Date().toISOString() }));
      evidence.unshift(createEvidence("document", "Original out-of-network denial", { documentId: document.id, documentFilename: document.filename, uploadedAt: new Date().toISOString() }));
      if (grounds.length && evidence.length) grounds[0].supportingEvidenceIds = evidence.map((item) => item.id);

      const appeal = createAppeal("out-of-network-denial", decision);
      appeal.grounds = grounds; appeal.evidence = evidence; appeal.updatedAt = new Date().toISOString();
      const supabase = await getSupabaseServer();
      const { error } = await supabase.from("appeals").insert({
        id: appeal.id, user_id: user.id, workflow_id: appeal.workflowId, status: appeal.status, decision: appeal.decision,
        grounds: appeal.grounds, evidence: appeal.evidence, arguments: appeal.arguments, draft: appeal.draft,
        review: null, packet: null, proof: null, timeline: appeal.timeline, version: 1, created_at: appeal.createdAt, updated_at: appeal.updatedAt,
      });
      if (error) throw new Error(`Unable to persist appeal case: ${error.message}`);
      return Response.json({ ok: true, appealId: appeal.id, workflowId: appeal.workflowId, workflow: { title: workflow.title, primaryKeyword: workflow.primaryKeyword }, document, analysis, provider: "gemini", model: gemini.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to analyze out-of-network denial.";
      return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
    }
  },
  },
    },
  });
