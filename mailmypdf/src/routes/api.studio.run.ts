import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { z } from "zod";
import { studioExecutionModes, studioNodeKinds } from "@/studio/domain/studio-workflow";
import { routeLLMRequest } from "@/studio/platform/llm-router";
import { findStudioCapability } from "@/studio/domain/studio-capability-catalog";
import { executeStudioEngine } from "@/studio/platform/studio-engine-executor";

const phaseSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(700),
  kind: z.enum(studioNodeKinds),
  capabilities: z
    .array(
      z.object({
        capabilityId: z.string().trim().min(1).max(100),
        executionMode: z.enum(studioExecutionModes),
        configuration: z.record(z.unknown()).optional(),
      }),
    )
    .max(10),
  gates: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(120),
        required: z.boolean(),
      }),
    )
    .max(8),
});

type TracePayload = {
  type: string;
  label: string;
  detail?: string;
  data?: Record<string, unknown>;
};

function sse(payload: TracePayload): string {
  return `event: trace\ndata: ${JSON.stringify({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...payload,
  })}\n\n`;
}

function serviceName(capabilityId: string): string {
  if (capabilityId.startsWith("stripe_")) return "Stripe";
  if (capabilityId.includes("mail")) return "MailMyPDF fulfillment";
  if (capabilityId.includes("supabase")) return "Supabase";
  if (capabilityId.includes("n8n")) return "n8n";
  return capabilityId;
}

export const Route = createFileRoute("/api/studio/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;
        const raw = await request.text();
        if (raw.length > 32_768) return Response.json({ error: "Studio phase request is too large." }, { status: 413 });
        let input: unknown;
        try { input = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
        const parsed = phaseSchema.safeParse(input);
        if (!parsed.success) {
          return Response.json(
            { error: "A complete Studio phase is required." },
            { status: 400 },
          );
        }

        const phase = parsed.data;
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (payload: TracePayload) =>
              controller.enqueue(encoder.encode(sse(payload)));

            try {
              send({
                type: "phase.started",
                label: `${phase.title} started`,
                detail: phase.objective,
              });

              let blocked = false;
              for (const capability of phase.capabilities) {
                send({
                  type: "capability.started",
                  label: capability.capabilityId,
                  detail: `Execution mode: ${capability.executionMode.replace("_", " ")}`,
                });

                const registered = findStudioCapability(capability.capabilityId);
                if (!registered || registered.mode !== capability.executionMode) {
                  blocked = true;
                  send({ type: "capability.blocked", label: capability.capabilityId + " is not bound in this execution mode", detail: "Select a registered capability with the correct execution mode." });
                  continue;
                }
                if (registered.runnable) {
                  const outcome = executeStudioEngine(capability.capabilityId, capability.configuration ?? {});
                  send({
                    type: "capability.completed",
                    label: registered.label + " executed",
                    detail: "Executed " + outcome.packageName + " on the server with no external effects.",
                    data: { output: outcome.output, limitations: outcome.limitations },
                  });
                } else if (capability.executionMode === "ai_advisory") {
                  const systemPrompt =
                    "You are a Private Office workflow phase assistant. Provide a concise, non-consequential advisory result. Do not assert facts not supplied, do not authorize payment, fulfillment, or mailing, and clearly identify assumptions.";
                  const userPrompt = `Phase: ${phase.title}\nObjective: ${phase.objective}\nCapability: ${capability.capabilityId}\nReturn the proposed output for this phase.`;
                  send({
                    type: "llm.request",
                    label: "Claude request sent",
                    detail: "The complete non-secret request payload is shown below.",
                    data: {
                      providerRequested: "anthropic",
                      systemPrompt,
                      userPrompt,
                    },
                  });

                  const result = await routeLLMRequest(
                    {
                      systemPrompt,
                      userPrompt,
                      maxTokens: 900,
                      temperature: 0.2,
                      promptVersion: "studio-phase-run-v1",
                    },
                    {
                      provider: "anthropic",
                      operation: "analyze",
                      workflowId: "studio",
                      noFallback: true,
                    },
                  );

                  if (result) {
                    send({
                      type: "llm.response",
                      label: `${result.provenance.provider} responded`,
                      detail: result.content,
                      data: {
                        provenance: result.provenance,
                        fallbackChain: result.fallbackChain,
                      },
                    });
                  } else {
                    blocked = true;
                    send({
                      type: "llm.unavailable",
                      label: "Claude is not configured for this local server",
                      detail:
                        "No AI result was fabricated. Configure the server's Anthropic provider, then run this phase again.",
                    });
                  }
                } else if (capability.executionMode === "external_service") {
                  blocked = true;
                  send({
                    type: "connector.simulated",
                    label: `${serviceName(capability.capabilityId)} action held for approval`,
                    detail:
                      "Studio simulation never sends payments, mail, or third-party actions. A published workflow must pass its required approval gate before its existing fulfillment adapter can act.",
                  });
                } else if (capability.executionMode === "human") {
                  blocked = true;
                  send({
                    type: "approval.required",
                    label: "Owner review required",
                    detail:
                      "This phase is paused for the required human decision.",
                  });
                } else {
                  blocked = true;
                  send({
                    type: "capability.blocked",
                    label: registered.label + " is cataloged but not connected to Studio execution",
                    detail: "A tested runtime adapter and required matter inputs are needed. Registry status is not evidence of execution.",
                  });
                }
              }

              const requiresReview = phase.gates.some((gate) => gate.required);
              if (requiresReview) blocked = true;
              send({
                type: blocked ? "phase.blocked" : "phase.completed",
                label: blocked ? "Phase awaiting a real execution adapter or approval" : "Phase complete",
                detail: requiresReview
                  ? `Required gates: ${phase.gates.filter((gate) => gate.required).map((gate) => gate.label).join(", ")}`
                  : blocked ? "A capability was unavailable or required review; no successful execution is asserted." : "The bound read-only operations completed.",
              });
            } catch (error) {
              send({
                type: "phase.failed",
                label: "Phase execution stopped",
                detail:
                  error instanceof Error
                    ? error.message
                    : "An unexpected server error occurred.",
              });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
          },
        });
      },
    },
  },
});
