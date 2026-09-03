import { createFileRoute } from "@tanstack/react-router";
import {
  requireAuthenticatedUser,
  getSupabaseServer,
} from "@/platform/supabase";
import { getWorkflow } from "@/domain/workflows";
import { validateAppealDraft } from "@/domain/draft-validator";

async function resolveClaude(task: "draft" | "validation") {
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
        task,
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
async function callClaude(
  config: { apiKey: string; model: string; promptOverride?: string },
  prompt: string,
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: config.promptOverride || prompt }],
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  } | null;
  if (!response.ok)
    throw new Error(
      body?.error?.message || `Claude request failed (${response.status}).`,
    );
  const text = body?.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Claude returned no response.");
  return text;
}
export const Route = createFileRoute("/api/workflows/ssi-denial/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const input = (await request.json()) as {
            appealId?: string;
            analysis?: unknown;
            draftOverride?: string;
          };
          if (!input.appealId?.trim())
            return Response.json(
              { error: "Appeal id is required." },
              { status: 400 },
            );
          const supabase = await getSupabaseServer();
          const { data: appeal, error } = await supabase
            .from("appeals")
            .select("*")
            .eq("id", input.appealId)
            .single();
          if (error || !appeal)
            return Response.json(
              { error: "Appeal case not found." },
              { status: 404 },
            );
          if (appeal.user_id !== user.id)
            return Response.json(
              { error: "You do not own this appeal case." },
              { status: 403 },
            );
          if (appeal.workflow_id !== "ssi-denial")
            return Response.json(
              { error: "Appeal workflow mismatch." },
              { status: 409 },
            );
          const workflow = getWorkflow("ssi-denial");
          const draftConfig = await resolveClaude("draft");
          const validationConfig = await resolveClaude("validation");
          const analysis = input.analysis || appeal.decision;
          const draft =
            input.draftOverride?.trim() ||
            (await callClaude(
              draftConfig,
              [
                `Create a response for the workflow: ${workflow.title}.`,
                workflow.workflowPrompt,
                `Focus on: ${workflow.focusAreas.join(", ")}.`,
                "Use only supplied facts. Do not invent SSA policy, legal authority, medical facts, dates, deadlines, or eligibility facts.",
                "Write a professional SSI response/appeal that a human can review and edit.",
                `CASE ANALYSIS:\n${JSON.stringify(analysis)}`,
              ].join("\n\n"),
            ));
          const validation = await callClaude(
            validationConfig,
            [
              `Audit this SSI response for: ${workflow.title}.`,
              "Return JSON with valid, issues, unsupportedClaims, missingEvidence, suggestions.",
              "Flag fabricated SSA/legal authority, unsupported medical/financial facts, missing evidence, contradictions, deadline issues, and factual uncertainty.",
              `CASE ANALYSIS:\n${JSON.stringify(analysis)}`,
              `DRAFT:\n${draft}`,
            ].join("\n\n"),
          );
          const draftValidation = validateAppealDraft(
            draft,
            appeal.decision || ({} as any),
            Array.isArray(appeal.grounds) ? appeal.grounds : [],
            Array.isArray(appeal.evidence) ? appeal.evidence : [],
          );
          const blockingFindings = draftValidation.findings.filter(
            (f) =>
              (f.severity === "block" || f.severity === "error") && !f.passed,
          );
          if (blockingFindings.length > 0)
            return Response.json(
              {
                error: "Draft failed validation.",
                draftValidation,
                blockingFindings,
              },
              { status: 422 },
            );
          const currentVersion = appeal.version ?? 1;
          const { error: updateError } = await supabase
            .from("appeals")
            .update({
              draft: `${draft}\n\nSincerely,\n[Your Name]`,
              status: "in_progress",
              version: currentVersion + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", appeal.id)
            .eq("user_id", user.id)
            .eq("version", currentVersion);
          if (updateError)
            throw new Error(`Unable to persist draft: ${updateError.message}`);
          return Response.json({
            ok: true,
            appealId: appeal.id,
            draft: `${draft}\n\nSincerely,\n[Your Name]`,
            validation,
            draftValidation,
            provider: "claude",
            draftModel: draftConfig.model,
            validationModel: validationConfig.model,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to create response.";
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
