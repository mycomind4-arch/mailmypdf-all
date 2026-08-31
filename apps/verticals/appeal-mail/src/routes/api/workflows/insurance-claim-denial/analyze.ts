import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { uploadDocument } from "@/platform/mailmypdf";
import { createDecision } from "@/domain/decision";
import { createAppeal } from "@/domain/appeal";
import { createGround } from "@/domain/ground";
import { createEvidence } from "@/domain/evidence";
import { getWorkflow } from "@/domain/workflows";

function mediaType(file: File): "application/pdf" | "image/png" | "image/jpeg" {
  if (file.type === "application/pdf") return "application/pdf";
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg") return "image/jpeg";
  throw new Error("Please upload a PDF, PNG, or JPEG document.");
}

async function resolveGemini(task: "analysis") {
  const base = process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.com";
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!token) throw new Error("MailMyPDF control-plane token is not configured.");
  const response = await fetch(`${base.replace(/\/$/, "")}/api/control-plane/ai`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ verticalSlug: "appeal-mail", workflowSlug: "insurance-claim-denial", task }),
  });
  const payload = await response.json().catch(() => null) as { provider?: string; apiKey?: string; model?: string; promptOverride?: string } | null;
  if (!response.ok || !payload?.apiKey || !payload.model) throw new Error("Gemini configuration is unavailable.");
  if (payload.provider !== "gemini") throw new Error("Insurance Claim Denial is currently configured for Gemini.");
  return payload;
}

export const Route = createFileRoute("/api/workflows/insurance-claim-denial/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
    try {
      const user = await requireAuthenticatedUser(request);
      const workflow = getWorkflow("insurance-claim-denial");
      const form = await request.formData();
      const file = form.get("document");
      if (!(file instanceof File)) return Response.json({ error: "A source document is required." }, { status: 400 });
      if (file.size === 0) return Response.json({ error: "The source document is empty." }, { status: 400 });
      if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Source documents must be 20 MB or smaller." }, { status: 413 });

      const document = await uploadDocument(file);
      const gemini = await resolveGemini("analysis");
      const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
      const prompt = [
        `Workflow: ${workflow.title}`,
        workflow.description,
        workflow.workflowPrompt,
        `Focus areas: ${workflow.focusAreas.join(", ")}.`,
        "Analyze the actual denial document. Extract only supported facts and clearly separate uncertainty.",
        "Identify denial reasons, coverage/policy references, disputed facts, deadlines, appeal instructions, and evidence needed.",
        "Return strict JSON only.",
        '{"summary":"","decision":"","decisionType":"insurance_claim_denial","issuer":"","referenceNumber":"","decisionDate":"","deadline":"","reasons":[],"keyFacts":[],"issues":[{"issue":"","whyItMatters":"","evidenceNeeded":[]}],"evidenceMentioned":[],"uncertainties":[],"confidence":"high|medium|low"}',
      ].join("\n\n");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(gemini.model)}:generateContent?key=${encodeURIComponent(gemini.apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType(file), data: bytes } }, { text: gemini.promptOverride || prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }),
      });
      const body = await response.json().catch(() => null) as any;
      if (!response.ok) throw new Error(body?.error?.message || `Gemini analysis failed (${response.status}).`);
      const text = body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
      if (!text) throw new Error("Gemini returned no analysis.");
      const analysis = JSON.parse(text) as {
        summary?: string; decision?: string; decisionType?: string; issuer?: string; referenceNumber?: string; decisionDate?: string; deadline?: string;
        reasons?: string[]; keyFacts?: string[]; issues?: Array<{ issue?: string; whyItMatters?: string; evidenceNeeded?: string[] }>;
        evidenceMentioned?: string[]; uncertainties?: string[]; confidence?: string;
      };

      const evidenceLabels = analysis.evidenceMentioned?.length ? analysis.evidenceMentioned : ["Source denial document"];
      const evidence = evidenceLabels.map((label) => createEvidence("document", label, { documentId: document.id, documentFilename: document.filename, uploadedAt: new Date().toISOString() }));
      const issueItems = analysis.issues?.length ? analysis.issues : [{ issue: "Review the stated denial basis against the supplied evidence", whyItMatters: "The denial should be evaluated against the actual source record.", evidenceNeeded: [] }];
      const grounds = issueItems.map((issue, index) => createGround("factual_error", {
        id: `ground-${index}-${crypto.randomUUID()}`,
        claim: issue.issue || "Review a stated denial issue",
        source: issue.whyItMatters || "Identified by document analysis",
        confidence: 0.65,
        supportingEvidenceIds: evidence.map((item) => item.id),
        unresolvedIssue: issue.evidenceNeeded?.join(", "),
      }));

      const decision = createDecision("claim_denial", {
        id: crypto.randomUUID(), documentId: document.id, documentFilename: document.filename, agency: analysis.issuer || undefined,
        referenceNumber: analysis.referenceNumber || undefined, decisionDate: analysis.decisionDate || undefined,
        decisionTypeLabel: analysis.decision || "Insurance claim denial", appealInstructions: undefined,
        deadline: analysis.deadline ? { date: analysis.deadline, type: "appeal", source: "extracted" } : undefined,
        facts: (analysis.keyFacts || []).map((value, index) => ({ id: `${index}-${crypto.randomUUID()}`, label: `Fact ${index + 1}`, value, source: "extracted", confidence: 0.8 })),
        reasons: (analysis.reasons || []).map((text, index) => ({ id: `${index}-${crypto.randomUUID()}`, text, confidence: 0.9 })),
        issues: issueItems.map((item, index) => ({ id: `${index}-${crypto.randomUUID()}`, description: item.issue || "Issue identified in denial", type: "factual_dispute", severity: "medium", sourceExcerpt: item.whyItMatters })),
        rawText: JSON.stringify(analysis), extractedAt: new Date().toISOString(),
        extractionConfidence: analysis.confidence === "high" ? 0.9 : analysis.confidence === "medium" ? 0.7 : 0.5,
      });

      const appeal = createAppeal("insurance-claim-denial", decision);
      appeal.grounds = grounds;
      appeal.evidence = evidence;
      appeal.updatedAt = new Date().toISOString();
      const supabase = await getSupabaseServer();
      const { error } = await supabase.from("appeals").insert({
        id: appeal.id, user_id: user.id, workflow_id: appeal.workflowId, status: appeal.status,
        decision: appeal.decision, grounds: appeal.grounds, evidence: appeal.evidence, arguments: appeal.arguments,
        draft: appeal.draft, review: null, packet: null, proof: null, timeline: appeal.timeline,
        version: 1, created_at: appeal.createdAt, updated_at: appeal.updatedAt,
      });
      if (error) throw new Error(`Unable to persist appeal case: ${error.message}`);

      return Response.json({ ok: true, appealId: appeal.id, workflowId: appeal.workflowId, workflow: { title: workflow.title, primaryKeyword: workflow.primaryKeyword }, document, analysis, provider: "gemini", model: gemini.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to analyze document.";
      return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
    }
  },
  },
    },
  });
