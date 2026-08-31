import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { uploadDocument } from "@/platform/mailmypdf";

export const Route = createFileRoute("/api/documents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAuthenticatedUser(request);
          const form = await request.formData();
          const file = form.get("file") ?? form.get("document");
          if (!(file instanceof File)) return Response.json({ error: "A document file is required." }, { status: 400 });
          if (!file.size) return Response.json({ error: "The document is empty." }, { status: 400 });
          if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Documents must be 20 MB or smaller." }, { status: 413 });
          const document = await uploadDocument(file);
          return Response.json({ document }, { status: 201 });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
