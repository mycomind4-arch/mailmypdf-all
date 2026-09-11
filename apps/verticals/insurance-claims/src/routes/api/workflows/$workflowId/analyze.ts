import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const maxDocumentBytes = 20 * 1024 * 1024;
const acceptedDocumentTypes = ["application/pdf", "image/png", "image/jpeg"];

export const Route = createFileRoute("/api/workflows/$workflowId/analyze")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            { error: "Server authentication is not configured." },
            { status: 500 },
          );
        }

        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return Response.json({ error: "Authentication required." }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        const { data, error } = await supabase.auth.getUser(authorization.slice(7));
        if (error || !data.user) {
          return Response.json(
            { error: "Invalid or expired session." },
            { status: 401 },
          );
        }

        const document = (await request.formData()).get("document");
        if (!(document instanceof File)) {
          return Response.json(
            { error: "A source document is required." },
            { status: 400 },
          );
        }
        if (document.size > maxDocumentBytes) {
          return Response.json({ error: "Document exceeds the 20 MB limit." }, { status: 413 });
        }
        if (document.type && !acceptedDocumentTypes.includes(document.type)) {
          return Response.json({ error: "Unsupported document type." }, { status: 415 });
        }

        return Response.json({
          analysis: {
            workflowId: params.workflowId,
            document: {
              name: document.name,
              size: document.size,
              type: document.type,
            },
            next: "analysis",
          },
        });
      },
    },
  },
});
