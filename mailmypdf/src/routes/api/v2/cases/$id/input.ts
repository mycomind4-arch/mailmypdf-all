import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { loadLatestCaseInput, saveCaseInput } from "@/lib/secure-core/case-inputs.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/input")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          return json(200, { input: await loadLatestCaseInput(params.id, context) });
        } catch (error) {
          return errorResponse("case-input-read", error);
        }
      },
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const version = await saveCaseInput(params.id, await readJson(request), context);
          return json(201, { version });
        } catch (error) {
          return errorResponse("case-input-write", error);
        }
      },
    },
  },
});
