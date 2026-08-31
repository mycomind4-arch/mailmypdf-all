import { createAPIFileRoute } from "@tanstack/react-start/api";

export const POST = createAPIFileRoute("/api/workflows/ssi-reconsideration/approve")({
  handler: async ({ request }) => {
    return Response.json({ error: "Not configured" }, { status: 503 });
  },
});
