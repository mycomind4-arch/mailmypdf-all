import { createFileRoute } from "@tanstack/react-router";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/secure-core/auth.server";
import {
  intakeSecureDocument,
  SecureDocumentValidationError,
} from "@/lib/secure-core/document-intake.server";

const responseHeaders = { "Cache-Control": "no-store", "Content-Type": "application/json" };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export const Route = createFileRoute("/api/v2/documents/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
            return json(415, { error: "multipart/form-data is required" });
          }

          const context = await requireAuthenticatedUser(request);
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) return json(400, { error: "A file is required" });

          const document = await intakeSecureDocument({
            file,
            workflowId: String(form.get("workflow_id") ?? ""),
            purpose: String(form.get("purpose") ?? ""),
            consent: form.get("consent") === "true",
          }, context);

          // Quarantined documents cannot be read, analyzed, merged, or mailed.
          return json(202, { document });
        } catch (error) {
          if (error instanceof AuthenticationError) return json(401, { error: error.message });
          if (error instanceof SecureDocumentValidationError) return json(400, { error: error.message });
          console.error("[secure-document-intake] request failed", error);
          return json(500, { error: "Document intake failed" });
        }
      },
    },
  },
});
