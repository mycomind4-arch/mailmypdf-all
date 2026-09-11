import { createFileRoute } from "@tanstack/react-router";
import { studioProposalSchema } from "@/domain/studio-proposal";
import { routeLLMRequest } from "@/platform/llm-router";

export const Route = createFileRoute("/api/studio/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          message?: unknown;
          currentWorkflow?: unknown;
        } | null;
        const message =
          typeof body?.message === "string" ? body.message.trim() : "";
        if (!message) {
          return Response.json(
            { error: "A workflow request is required." },
            { status: 400 },
          );
        }

        const systemPrompt =
          "You are the Private Office Build Studio architect. Return only valid JSON, with no markdown. Design a safe, owner-reviewable workflow. Never include executable code or automatic external actions. JSON shape: {title:string, explanation:string, landingPage:{headline:string,description:string,primaryAction:string}, phases:[{id:string,title:string,objective:string,kind:'input'|'research'|'analysis'|'authority'|'gate'|'review'|'action'|'output',variables:[{id:string,label:string,value:string,description?:string}],capabilities:[{capabilityId:string,executionMode:'deterministic'|'ai_advisory'|'official_source'|'human'|'external_service',required:boolean}],gates:[{type:'evidence'|'authority'|'human-review'|'professional-review'|'consequential-action'|'custom',label:string,required:boolean]}]}. Include 3 to 10 phases. Add 1 to 4 owner-adjustable variables to each user-facing phase. Include an approval gate before a consequential action or external service. Capability identifiers and variable IDs must be concise kebab-case names. The landing-page copy must describe a correspondence and documentation service, never legal advice or guaranteed outcomes.";
        const userPrompt = body?.currentWorkflow
          ? `${message}\n\nCurrent Studio workflow summary:\n${JSON.stringify(body.currentWorkflow)}`
          : message;
        const result = await routeLLMRequest(
          {
            systemPrompt,
            userPrompt,
            maxTokens: 2600,
            temperature: 0.3,
            promptVersion: "studio-workflow-v2",
          },
          {
            provider: "anthropic",
            operation: "assist_draft",
            workflowId: "studio",
            noFallback: true,
          },
        );
        if (!result) {
          return Response.json(
            {
              error:
                "Claude is not configured for this local server. Configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL, then try again.",
            },
            { status: 503 },
          );
        }

        const raw = result.content
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        let value: unknown;
        try {
          value = JSON.parse(raw);
        } catch {
          return Response.json(
            { error: "Claude returned invalid JSON for the workflow proposal." },
            { status: 502 },
          );
        }

        const proposal = studioProposalSchema.safeParse(value);
        if (!proposal.success) {
          return Response.json(
            {
              error:
                "Claude returned a workflow that does not meet Studio's safety contract.",
            },
            { status: 502 },
          );
        }
        return Response.json({
          proposal: proposal.data,
          provenance: result.provenance,
          fallbackChain: result.fallbackChain,
        });
      },
    },
  },
});
