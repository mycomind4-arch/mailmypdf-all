import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { CaseError, loadCase, setCaseStatus } from "@/lib/secure-core/case.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

const MAX_DRAFT_CHARS = 100_000;

export const Route = createFileRoute("/api/v2/cases/$id/draft")({
  server: {
    handlers: {
      // Saves a new immutable draft version. Editing history is preserved so an
      // approval can be traced back to the exact text that was approved.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          await loadCase(params.id, context);

          const body = await readJson(request);
          const text = typeof body.body_text === "string" ? body.body_text.trim() : "";
          if (!text) throw new CaseError("A draft response is required");
          if (text.length > MAX_DRAFT_CHARS) throw new CaseError("The draft response is too long");

          const { data: latest } = await context.supabase
            .from("case_drafts")
            .select("version")
            .eq("case_id", params.id)
            .eq("owner_id", context.user.id)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

          const version = (latest?.version ?? 0) + 1;
          const { error } = await context.supabase.from("case_drafts").insert({
            case_id: params.id,
            owner_id: context.user.id,
            version,
            body_text: text,
          });
          if (error) throw new CaseError("Unable to save the draft response");

          await setCaseStatus(params.id, "drafted", context);
          return json(201, { version });
        } catch (error) {
          return errorResponse("case-draft", error);
        }
      },
    },
  },
});
