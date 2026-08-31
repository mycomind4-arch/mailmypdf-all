import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAdmin, NoticeRespondAuthError } from "@/lib/auth-guard";
import { workflows } from "@/domain/workflows";

export const Route = createFileRoute("/api/admin/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireAdmin(request);
          const controlPlaneConfigured = Boolean(process.env.MAILMYPDF_CONTROL_PLANE_URL && process.env.MAILMYPDF_CONTROL_PLANE_TOKEN);
          const mailMyPDFConfigured = Boolean(process.env.MAILMYPDF_API_URL && process.env.MAILMYPDF_API_KEY);
          return Response.json({
            ok: true,
            userId: user.id,
            workflowsRegistered: Object.keys(workflows).length,
            mailmypdf_configured: mailMyPDFConfigured,
            control_plane_configured: controlPlaneConfigured,
            stripe_configured: Boolean(process.env.STRIPE_SECRET_KEY),
          });
        } catch (error) {
          if (error instanceof NoticeRespondAuthError) return authErrorResponse(error);
          return authErrorResponse(error);
        }
      },
    },
  },
});
