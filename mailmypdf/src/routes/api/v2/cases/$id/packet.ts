import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { assertMailClass, materializePacketPreview, previewPacket } from "@/lib/secure-core/case-approval.server";
import { acceptsPacketPdf, packetPdfReviewResponse } from "@/lib/secure-core/packet-pdf-review.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/packet")({
  server: {
    handlers: {
      // Existing JSON contract is unchanged. A caller explicitly requesting
      // Accept: application/pdf receives the exact owner-scoped assembled
      // packet bytes, not merely a digest or metadata summary.
      // This is a read-only review, not approval, payment, or mailing.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);
          const mailClass = assertMailClass(body.mail_class);
          if (acceptsPacketPdf(request.headers.get("accept"))) {
            // Do not mutate measured-page records merely to display a PDF.
            // The later approval boundary independently rebuilds, measures,
            // checks the reviewed digest/price, and persists its own counts.
            const packet = await materializePacketPreview(
              params.id, mailClass, context, { persistMeasuredPages: false },
            );
            return packetPdfReviewResponse(packet);
          }
          const preview = await previewPacket(params.id, mailClass, context);
          return json(200, { packet: preview });
        } catch (error) {
          return errorResponse("case-packet", error);
        }
      },
    },
  },
});
