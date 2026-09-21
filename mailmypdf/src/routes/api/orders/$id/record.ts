import { createFileRoute } from "@tanstack/react-router";
import { serveMailingRecord } from "@/lib/mailing-record";

export const Route = createFileRoute("/api/orders/$id/record")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { getMailService } = await import("@/services");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return serveMailingRecord(request, params.id, {
          loadOrder: (id, token) => getMailService().getOrder(id, token),
          download: async (path) => {
            const { data, error } = await supabaseAdmin.storage.from("order-pdfs").download(path);
            return error ? null : data;
          },
        });
      },
    },
  },
});
