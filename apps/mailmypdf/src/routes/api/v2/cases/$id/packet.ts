import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { assertMailClass, previewPacket } from "@/lib/secure-core/case-approval.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/packet")({
  server: {
    handlers: {
      // Builds the packet and prices it without recording anything, so the
      // review window shows the same figures the approval will bind.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);
          const preview = await previewPacket(params.id, assertMailClass(body.mail_class), context);
          return json(200, { packet: preview });
        } catch (error) {
          return errorResponse("case-packet", error);
        }
      },
    },
  },
});
