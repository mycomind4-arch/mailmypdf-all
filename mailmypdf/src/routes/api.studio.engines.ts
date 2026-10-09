import { createFileRoute } from "@tanstack/react-router";
import { adminFactoryAccessError } from "@/studio/access";
import { studioCapabilityCatalog, studioRunnableEngines } from "@/studio/domain/studio-capability-catalog";
import { executeStudioEngine, StudioEngineInputError } from "@/studio/platform/studio-engine-executor";

const MAX_BYTES = 32_768;
const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

export const Route = createFileRoute("/api/studio/engines")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await adminFactoryAccessError(request);
        if (denied) return denied;
        return Response.json({ capabilities: studioCapabilityCatalog, runnableEngines: studioRunnableEngines }, { headers });
      },
      POST: async ({ request }) => {
        const denied = await adminFactoryAccessError(request);
        if (denied) return denied;
        if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
          return Response.json({ error: "Engine request is too large." }, { status: 413, headers });
        }
        const raw = await request.text();
        if (raw.length > MAX_BYTES) {
          return Response.json({ error: "Engine request is too large." }, { status: 413, headers });
        }
        let body: unknown;
        try { body = JSON.parse(raw); } catch {
          return Response.json({ error: "Expected a JSON request body." }, { status: 400, headers });
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return Response.json({ error: "Expected an engine ID and JSON input object." }, { status: 400, headers });
        }
        const requestBody = body as Record<string, unknown>;
        if (typeof requestBody.engineId !== "string" || requestBody.engineId.length > 100) {
          return Response.json({ error: "Invalid engine ID." }, { status: 400, headers });
        }
        try {
          const output = executeStudioEngine(requestBody.engineId, requestBody.input);
          return Response.json(output, { headers });
        } catch (error) {
          if (error instanceof StudioEngineInputError) {
            return Response.json({ error: error.message }, { status: 400, headers });
          }
          return Response.json({ error: "Engine failed to execute. Check the input and package configuration." }, { status: 422, headers });
        }
      },
    },
  },
});
