import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { approvePacket, assertMailClass, assertRecipient, assertReviewedPacket } from "@/lib/secure-core/case-approval.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/approve")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);

          const { data, error } = await context.supabase
            .from("case_approvals")
            .select("id, packet_sha256, response_pages, supporting_pages, recipient, mail_class, quote, approved_at")
            .eq("case_id", params.id)
            .eq("owner_id", context.user.id)
            .order("approved_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          return json(200, {
            approval: data
              ? {
                  approval_id: data.id,
                  packet_sha256: data.packet_sha256,
                  response_pages: data.response_pages,
                  supporting_pages: data.supporting_pages,
                  recipient: data.recipient,
                  mail_class: data.mail_class,
                  quote: data.quote,
                  approved_at: data.approved_at,
                }
              : null,
          });
        } catch (error) {
          return errorResponse("case-approval-read", error);
        }
      },

      // Records an immutable approval bound to this exact packet. The packet is
      // rebuilt and repriced here, so anything that changed since the preview
      // produces a different hash rather than a silent substitution.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);
          const reviewed = {
            packetSha256: body.expected_packet_sha256 as string,
            totalCents: body.expected_total_cents as number,
          };
          assertReviewedPacket(reviewed, reviewed);

          const result = await approvePacket({
            caseId: params.id,
            recipient: assertRecipient(body.recipient),
            mailClass: assertMailClass(body.mail_class),
            reviewed,
          }, context);

          return json(201, {
            approval_id: result.approvalId,
            packet_sha256: result.preview.packetSha256,
            response_pages: result.preview.responsePages,
            supporting_pages: result.preview.supportingPages,
            quote: result.preview.quote,
          });
        } catch (error) {
          return errorResponse("case-approve", error);
        }
      },
    },
  },
});
