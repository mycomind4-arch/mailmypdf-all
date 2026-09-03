import { createFileRoute } from "@tanstack/react-router";
import {
  requireAuthenticatedUser,
  getSupabaseServer,
} from "@/platform/supabase";
import { uploadDocument } from "@/platform/mailmypdf";
import { createDecision } from "@/domain/decision";
import { createAppeal } from "@/domain/appeal";
import { createGround } from "@/domain/ground";
import { createEvidence } from "@/domain/evidence";
import { getWorkflow } from "@/domain/workflows";

type AiConfig = {
  provider?: string;
  apiKey?: string;
  model?: string;
  promptOverride?: string;
};

async function resolveClaude() {
  const base =
    process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.com";
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!token)
    throw new Error("MailMyPDF control-plane token is not configured.");
  const response = await fetch(
    `${base.replace(/\/$/, "")}/api/control-plane/ai`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        verticalSlug: "appeal-mail",
        workflowSlug: "ssi-denial",
        task: "analysis",
      }),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    provider?: string;
    apiKey?: string;
    model?: string;
    promptOverride?: string;
  } | null;
  if (
    !response.ok ||
    !payload?.apiKey ||
    !payload.model ||
    !["claude", "anthropic"].includes(payload.provider || "")
  )
    throw new Error("Claude configuration is unavailable for this workflow.");
  return payload;
}

async function callClaudeDocument(
  config: AiConfig,
  prompt: string,
  file: File,
  data: string,
) {
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Please upload a PDF, PNG, or JPEG document.");
  }
  const documentBlock =
    file.type === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: file.type, data },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: file.type, data },
        };
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            documentBlock,
            { type: "text", text: config.promptOverride || prompt },
          ],
        },
      ],
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  } | null;
  if (!response.ok)
    throw new Error(
      body?.error?.message || `Claude analysis failed (${response.status}).`,
    );
  const text = body?.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Claude returned no analysis.");
  return { text, model: config.model };
}

export const Route = createFileRoute("/api/workflows/ssi-denial/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const workflow = getWorkflow("ssi-denial");
          const form = await request.formData();
          const file = form.get("document");
          if (!(file instanceof File))
            return Response.json(
              { error: "A source document is required." },
              { status: 400 },
            );
          if (file.size === 0)
            return Response.json(
              { error: "The source document is empty." },
              { status: 400 },
            );
          if (file.size > 20 * 1024 * 1024)
            return Response.json(
              { error: "Source documents must be 20 MB or smaller." },
              { status: 413 },
            );
          const document = await uploadDocument(file);
          const claude = await resolveClaude();
          const bytes = Buffer.from(await file.arrayBuffer()).toString(
            "base64",
          );
          const prompt = [
            `Workflow: ${workflow.title}`,
            workflow.description,
            workflow.workflowPrompt,
            `Focus areas: ${workflow.focusAreas.join(", ")}.`,
            "Analyze the actual SSI decision/notice. Extract only supported facts. Clearly separate uncertainty and never invent eligibility, medical, financial, legal, or SSA facts.",
            "Identify decision type, stated eligibility findings, denial/reduction/termination reasons, dates, deadlines, appeal instructions, evidence considered, evidence gaps, and disputed facts.",
            "Return strict JSON only.",
            '{"summary":"","decision":"","decisionType":"ssi_denial","issuer":"","referenceNumber":"","decisionDate":"","deadline":"","reasons":[],"keyFacts":[],"issues":[{"issue":"","whyItMatters":"","evidenceNeeded":[]}],"evidenceMentioned":[],"uncertainties":[],"confidence":"high|medium|low"}',
          ].join("\n\n");
          const { text, model } = await callClaudeDocument(
            claude,
            prompt,
            file,
            bytes,
          );
          const analysis = JSON.parse(text) as {
            summary?: string;
            decision?: string;
            issuer?: string;
            referenceNumber?: string;
            decisionDate?: string;
            deadline?: string;
            reasons?: string[];
            keyFacts?: string[];
            issues?: Array<{
              issue?: string;
              whyItMatters?: string;
              evidenceNeeded?: string[];
            }>;
            evidenceMentioned?: string[];
            uncertainties?: string[];
            confidence?: string;
          };
          const decision = createDecision("benefits_denial", {
            id: crypto.randomUUID(),
            documentId: document.id,
            documentFilename: document.filename,
            agency: analysis.issuer || "Social Security Administration",
            referenceNumber: analysis.referenceNumber || undefined,
            decisionDate: analysis.decisionDate || undefined,
            decisionTypeLabel: analysis.decision || "SSI denial",
            appealInstructions: undefined,
            deadline: analysis.deadline
              ? { date: analysis.deadline, type: "appeal", source: "extracted" }
              : undefined,
            facts: (analysis.keyFacts || []).map((value, index) => ({
              id: `${index}-${crypto.randomUUID()}`,
              label: `Fact ${index + 1}`,
              value,
              source: "extracted",
              confidence: 0.8,
            })),
            reasons: (analysis.reasons || []).map((text, index) => ({
              id: `${index}-${crypto.randomUUID()}`,
              text,
              confidence: 0.9,
            })),
            issues: (analysis.issues || []).map((item, index) => ({
              id: `${index}-${crypto.randomUUID()}`,
              description: item.issue || "Issue identified in SSI decision",
              type: "factual_dispute",
              severity: "medium",
              sourceExcerpt: item.whyItMatters,
            })),
            rawText: JSON.stringify(analysis),
            extractedAt: new Date().toISOString(),
            extractionConfidence:
              analysis.confidence === "high"
                ? 0.9
                : analysis.confidence === "medium"
                  ? 0.7
                  : 0.5,
          });
          const grounds = (analysis.issues || []).map((issue, index) =>
            createGround("factual_error", {
              id: `ground-${index}-${crypto.randomUUID()}`,
              claim: issue.issue || "Review a stated SSI decision issue",
              source: issue.whyItMatters || "Identified by document analysis",
              confidence: 0.65,
              unresolvedIssue: issue.evidenceNeeded?.join(", "),
            }),
          );
          const evidence = (analysis.evidenceMentioned || []).map((label) =>
            createEvidence("document", label, {
              documentId: document.id,
              documentFilename: document.filename,
              uploadedAt: new Date().toISOString(),
            }),
          );
          const appeal = createAppeal("ssi-denial", decision);
          appeal.grounds = grounds;
          appeal.evidence = evidence;
          appeal.updatedAt = new Date().toISOString();
          const supabase = await getSupabaseServer();
          const { error } = await supabase.from("appeals").insert({
            id: appeal.id,
            user_id: user.id,
            workflow_id: appeal.workflowId,
            status: appeal.status,
            decision: appeal.decision,
            grounds: appeal.grounds,
            evidence: appeal.evidence,
            arguments: appeal.arguments,
            draft: appeal.draft,
            review: null,
            packet: null,
            proof: null,
            timeline: appeal.timeline,
            version: 1,
            created_at: appeal.createdAt,
            updated_at: appeal.updatedAt,
          });
          if (error)
            throw new Error(`Unable to persist appeal case: ${error.message}`);
          return Response.json({
            ok: true,
            appealId: appeal.id,
            workflowId: appeal.workflowId,
            workflow: {
              title: workflow.title,
              primaryKeyword: workflow.primaryKeyword,
            },
            document,
            analysis,
            provider: "claude",
            model,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to analyze document.";
          return Response.json(
            { error: message },
            {
              status: /authentication|required|token/i.test(message)
                ? 401
                : 502,
            },
          );
        }
      },
    },
  },
});
