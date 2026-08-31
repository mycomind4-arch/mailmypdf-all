import { createFileRoute } from "@tanstack/react-router";
import { requireInternalServiceKey } from "@/server/internal-auth";
import { uploadDocument } from "@/platform/mailmypdf";
import { workflows } from "@/domain/workflows";

export const Route = createFileRoute("/api/workflows/$workflowId/document")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        requireInternalServiceKey(request);
        if (!(params.workflowId in workflows)) return Response.json({ error: "Unknown workflow" }, { status: 404 });
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
        if (!file.name.trim()) return Response.json({ error: "file name is required" }, { status: 400 });
        const document = await uploadDocument(file);
        return Response.json({ document });
      },
    },
  },
});
